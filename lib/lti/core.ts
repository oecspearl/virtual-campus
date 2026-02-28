/**
 * LTI 1.3 Core Implementation
 * Implements Learning Tools Interoperability 1.3 specification
 * https://www.imsglobal.org/spec/lti/v1p3/
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export interface LTIJWTClaims {
  iss: string; // Issuer (platform identifier)
  sub: string; // Subject (user identifier)
  aud: string; // Audience (tool client_id)
  exp: number; // Expiration
  iat: number; // Issued at
  nonce: string; // Nonce for replay protection
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  'https://purl.imsglobal.org/spec/lti/claim/message_type': string;
  'https://purl.imsglobal.org/spec/lti/claim/version': string;
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
    id: string;
    title?: string;
    description?: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/context': {
    id: string;
    label?: string;
    title?: string;
    type?: string[];
  };
  'https://purl.imsglobal.org/spec/lti/claim/tool_platform': {
    name?: string;
    contact_email?: string;
    description?: string;
    version?: string;
    product_family_code?: string;
    guid?: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/roles': string[];
  'https://purl.imsglobal.org/spec/lti/claim/custom'?: Record<string, any>;
  'https://purl.imsglobal.org/spec/lti/claim/launch_presentation': {
    document_target?: string;
    height?: number;
    width?: number;
    return_url?: string;
    locale?: string;
  };
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export interface LTITool {
  id: string;
  name: string;
  client_id: string;
  tool_url: string;
  login_url: string;
  launch_url: string;
  tool_keyset_url?: string;
  tool_oidc_login_url?: string;
  deployment_id?: string;
  platform_public_key?: string;
  tool_public_key?: string;
}

export interface LTILaunchParams {
  tool_id: string;
  user_id: string;
  course_id?: string;
  class_id?: string;
  resource_link_id?: string;
  context_id?: string;
  context_title?: string;
  context_label?: string;
  roles: string[];
  custom_parameters?: Record<string, any>;
  return_url?: string;
}

/**
 * Generate a secure nonce for LTI launch
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Get LTI platform configuration
 */
export async function getPlatformConfig() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('lti_platform_config')
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('LTI platform configuration not found. Please configure LTI platform settings.');
  }

  return data;
}

/**
 * Get LTI tool by client_id
 */
export async function getLTITool(clientId: string): Promise<LTITool | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('lti_tools')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  return data as LTITool;
}

/**
 * Get LTI tool by ID
 */
export async function getLTIToolById(toolId: string): Promise<LTITool | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('lti_tools')
    .select('*')
    .eq('id', toolId)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  return data as LTITool;
}

/**
 * Map LMS role to LTI role
 */
export function mapRoleToLTI(role: string, isInstructor: boolean = false): string[] {
  const roleMap: Record<string, string[]> = {
    'student': ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
    'instructor': ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'],
    'admin': ['http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator'],
    'super_admin': ['http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator'],
    'curriculum_designer': ['http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper'],
  };

  const ltiRoles = roleMap[role] || ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'];

  // Add institutional role if instructor
  if (isInstructor || role === 'instructor') {
    ltiRoles.push('http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor');
  }

  return ltiRoles;
}

/**
 * Create LTI 1.3 JWT launch message
 */
export async function createLTILaunchJWT(
  params: LTILaunchParams,
  tool: LTITool
): Promise<string> {
  const platformConfig = await getPlatformConfig();
  const nonce = generateNonce();
  const now = Math.floor(Date.now() / 1000);

  // Get user information
  const supabase = createServiceSupabaseClient();
  const { data: user } = await supabase
    .from('users')
    .select('email, name, role')
    .eq('id', params.user_id)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  // Get course information if provided
  let courseData = null;
  if (params.course_id) {
    const { data: course } = await supabase
      .from('courses')
      .select('title, description')
      .eq('id', params.course_id)
      .single();
    courseData = course;
  }

  // Build JWT claims
  const claims: Partial<LTIJWTClaims> = {
    iss: platformConfig.issuer,
    sub: params.user_id,
    aud: tool.client_id,
    exp: now + 3600, // 1 hour expiration
    iat: now,
    nonce,
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id': tool.deployment_id || 'default',
    'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
    'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
    'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
      id: params.resource_link_id || crypto.randomUUID(),
      title: courseData?.title,
      description: courseData?.description,
    },
    'https://purl.imsglobal.org/spec/lti/claim/context': {
      id: params.context_id || params.course_id || '',
      label: params.context_label,
      title: params.context_title || courseData?.title,
      type: ['CourseOffering'],
    },
    'https://purl.imsglobal.org/spec/lti/claim/tool_platform': {
      name: 'OECS Learning Hub',
      product_family_code: 'oecs-lms',
      version: '1.0.0',
    },
    'https://purl.imsglobal.org/spec/lti/claim/roles': params.roles,
    'https://purl.imsglobal.org/spec/lti/claim/launch_presentation': {
      document_target: 'window',
      return_url: params.return_url,
    },
    email: user.email,
    name: user.name,
  };

  // Add custom parameters if provided
  if (params.custom_parameters && Object.keys(params.custom_parameters).length > 0) {
    claims['https://purl.imsglobal.org/spec/lti/claim/custom'] = params.custom_parameters;
  }

  // Sign JWT with platform private key
  const privateKey = platformConfig.platform_private_key;
  const token = jwt.sign(claims, privateKey, {
    algorithm: 'RS256',
    keyid: 'lti-platform-key',
  });

  // Store launch record
  await supabase.from('lti_launches').insert({
    tool_id: tool.id,
    user_id: params.user_id,
    course_id: params.course_id || null,
    class_id: params.class_id || null,
    nonce,
    message_type: 'LtiResourceLinkRequest',
    version: '1.3.0',
    resource_link_id: params.resource_link_id ? crypto.createHash('sha256').update(params.resource_link_id).digest('hex') : null,
    context_id: params.context_id || params.course_id || null,
    context_title: params.context_title || courseData?.title || null,
    context_label: params.context_label || null,
    roles: params.roles,
    custom_parameters: params.custom_parameters || {},
    launch_data: claims,
    expires_at: new Date((now + 3600) * 1000).toISOString(),
  });

  return token;
}

/**
 * Validate LTI JWT from tool
 */
export async function validateLTIJWT(token: string, tool: LTITool): Promise<any> {
  try {
    // Get tool's public key
    if (!tool.tool_public_key && !tool.tool_keyset_url) {
      throw new Error('Tool public key or keyset URL required');
    }

    // For now, we'll use the public key directly
    // In production, you should fetch from keyset_url and cache it
    const publicKey = tool.tool_public_key;
    if (!publicKey) {
      throw new Error('Tool public key not available');
    }

    // Verify JWT
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      audience: tool.client_id,
    }) as any;

    return decoded;
  } catch (error) {
    console.error('LTI JWT validation error:', error);
    throw new Error('Invalid LTI JWT token');
  }
}

/**
 * Generate OAuth 2.0 access token for tool
 */
export async function generateAccessToken(toolId: string, scopes: string[] = []): Promise<string> {
  const platformConfig = await getPlatformConfig();
  const now = Math.floor(Date.now() / 1000);

  const claims = {
    iss: platformConfig.issuer,
    sub: toolId,
    aud: platformConfig.issuer,
    exp: now + 3600, // 1 hour
    iat: now,
    scope: scopes.join(' '),
  };

  const privateKey = platformConfig.platform_private_key;
  const token = jwt.sign(claims, privateKey, {
    algorithm: 'RS256',
  });

  // Store token
  const supabase = createServiceSupabaseClient();
  await supabase.from('lti_access_tokens').insert({
    tool_id: toolId,
    access_token: token,
    token_type: 'Bearer',
    expires_at: new Date((now + 3600) * 1000).toISOString(),
    scope: scopes.join(' '),
  });

  return token;
}

