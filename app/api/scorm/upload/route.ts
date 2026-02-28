import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/database-helpers";
import { parseStringPromise } from 'xml2js';
import JSZip from 'jszip';

// Maximum SCORM package size: 200MB
const MAX_PACKAGE_SIZE = 200 * 1024 * 1024;

// Increase timeout for SCORM uploads (max 300 seconds = 5 minutes for Vercel/Next.js)
export const maxDuration = 300;
export const runtime = 'nodejs';

interface SCORMManifest {
  manifest: {
    metadata?: Array<{
      schema?: Array<string>;
      schemaversion?: Array<string>;
    }>;
    organizations?: Array<{
      organization?: Array<{
        $?: { identifier?: string };
        title?: Array<{ _?: string } | string>;
      }>;
    }>;
    resources?: Array<{
      resource?: Array<{
        $?: {
          identifier?: string;
          type?: string;
          href?: string;
        };
        metadata?: Array<{
          title?: Array<{ _?: string } | string>;
        }>;
      }>;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check user role
    const allowedRoles = ['instructor', 'curriculum_designer', 'admin', 'super_admin'];
    if (!allowedRoles.includes(user.role || '')) {
      return NextResponse.json({ error: "Insufficient permissions. Only instructors and admins can upload SCORM packages." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const lessonId = formData.get('lessonId') as string | null;
    const courseId = formData.get('courseId') as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
    }

    // Validate file type (must be ZIP)
    if (!file.name.endsWith('.zip') && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      return NextResponse.json({ error: "SCORM package must be a ZIP file" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_PACKAGE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_PACKAGE_SIZE / (1024 * 1024)}MB.` 
      }, { status: 413 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createServiceSupabaseClient();

    // Verify lesson exists and user has access
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, course_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Use course_id from lesson if not provided
    const finalCourseId = courseId || lesson.course_id;

    // Read and parse ZIP file
    const arrayBuffer = await file.arrayBuffer();
    let zipContent: any;
    
    try {
      zipContent = await JSZip.loadAsync(arrayBuffer);
      console.log('[SCORM Upload] ZIP file loaded successfully, size:', file.size, 'bytes');
    } catch (error) {
      console.error('[SCORM Upload] ZIP parsing error:', error);
      return NextResponse.json({ 
        error: "Invalid ZIP file format",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 400 });
    }

    // Find manifest file (usually imsmanifest.xml in root)
    let manifestFile = zipContent.file('imsmanifest.xml');
    
    // If not in root, search for it
    if (!manifestFile) {
      const manifestPaths = Object.keys(zipContent.files).filter(path => 
        path.toLowerCase().endsWith('imsmanifest.xml')
      );
      if (manifestPaths.length > 0) {
        manifestFile = zipContent.file(manifestPaths[0]);
      }
    }

    if (!manifestFile) {
      const allFiles = Object.keys(zipContent.files).slice(0, 20); // First 20 for logging
      console.error('[SCORM Upload] Manifest file not found. Files in package:', allFiles);
      return NextResponse.json({ 
        error: "SCORM package must contain imsmanifest.xml file",
        details: `Could not find imsmanifest.xml in package. Found ${Object.keys(zipContent.files).length} files total.`
      }, { status: 400 });
    }

    // Parse manifest XML
    const manifestXml = await manifestFile.async('string');
    let parsedManifest: SCORMManifest;
    
    try {
      parsedManifest = await parseStringPromise(manifestXml, {
        explicitArray: true,
        mergeAttrs: true,
        explicitCharkey: true,
        trim: true
      }) as SCORMManifest;
    } catch (error) {
      console.error('[SCORM Upload] Manifest parsing error:', error);
      const manifestPreview = manifestXml.substring(0, 500); // First 500 chars for debugging
      console.error('[SCORM Upload] Manifest XML preview:', manifestPreview);
      return NextResponse.json({ 
        error: "Failed to parse SCORM manifest XML",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 400 });
    }

    // Extract SCORM version
    const manifest = parsedManifest.manifest;
    const schema = manifest.metadata?.[0]?.schema?.[0];
    const schemaVersion = manifest.metadata?.[0]?.schemaversion?.[0];
    
    let scormVersion = '1.2'; // Default
    const schemaStr = typeof schema === 'string' ? schema : String(schema || '');
    const schemaVersionStr = typeof schemaVersion === 'string' ? schemaVersion : String(schemaVersion || '');
    
    if (schemaVersionStr === '2004 4th Edition' || schemaVersionStr === '2004 3rd Edition') {
      scormVersion = '2004';
    } else if (schemaStr && (schemaStr.includes('2004') || schemaStr.includes('1.3'))) {
      scormVersion = '2004';
    }

    // Extract title and identifier
    const organization = manifest.organizations?.[0]?.organization?.[0];
    const title = organization?.title?.[0];
    const titleText = typeof title === 'string' ? title : (title as any)?._ || file.name.replace('.zip', '');
    const identifier = organization?.$?.identifier || `scorm-${Date.now()}`;

    // Extract description from metadata if available
    const resources = manifest.resources?.[0]?.resource || [];
    const description = resources.length > 0 ? `SCORM package with ${resources.length} resource(s)` : null;

    // Generate unique folder name for extracted package
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const packageFolder = `scorm-packages/${timestamp}-${randomString}`;

    // Upload extracted files to Supabase Storage
    const uploadedFiles: string[] = [];
    const filePaths = Object.keys(zipContent.files).filter(path => !zipContent.files[path].dir);
    
    console.log(`[SCORM Upload] Extracting ${filePaths.length} files from package`);
    
    // Upload files in batches to improve performance and avoid overwhelming the system
    // Increased batch size for faster processing - Heroku has 30s timeout limit
    const BATCH_SIZE = 50; // Upload 50 files at a time in parallel for faster processing
    
    try {
      const startTime = Date.now();
      for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
        const batch = filePaths.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(filePaths.length / BATCH_SIZE);
        
        console.log(`[SCORM Upload] Processing batch ${batchNum}/${totalBatches} (${batch.length} files)`);
        
        // Process batch in parallel
        const uploadPromises = batch.map(async (filePath) => {
          const fileEntry = zipContent.files[filePath];
          
          try {
            // Read file content
            const fileContent = await fileEntry.async('arraybuffer');
            const storagePath = `${packageFolder}/${filePath}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await serviceSupabase.storage
              .from('course-materials')
              .upload(storagePath, fileContent, {
                cacheControl: '3600',
                upsert: false,
                contentType: 'application/octet-stream'
              });

            if (uploadError) {
              console.error(`Error uploading ${filePath}:`, uploadError);
              return null; // Return null for failed uploads
            }
            
            return storagePath;
          } catch (error) {
            console.error(`Error processing ${filePath}:`, error);
            return null;
          }
        });
        
        // Wait for batch to complete
        const batchResults = await Promise.all(uploadPromises);
        
        // Add successful uploads to the list
        const successful = batchResults.filter(r => r !== null).length;
        batchResults.forEach((result) => {
          if (result) {
            uploadedFiles.push(result);
          }
        });
        
        console.log(`[SCORM Upload] Batch ${batchNum} complete: ${successful}/${batch.length} files uploaded`);
        
        // Check if we're taking too long (Heroku has 30s timeout, but we need buffer)
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 25) {
          console.warn(`[SCORM Upload] Warning: ${elapsed.toFixed(1)}s elapsed, approaching timeout`);
        }
      }
      
      console.log(`[SCORM Upload] All files extracted: ${uploadedFiles.length}/${filePaths.length} successful`);
    } catch (extractError) {
      console.error('Error extracting package:', extractError);
      // Clean up uploaded files
      if (uploadedFiles.length > 0) {
        try {
          await serviceSupabase.storage.from('course-materials').remove(uploadedFiles);
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }
      return NextResponse.json({ error: "Failed to extract SCORM package" }, { status: 500 });
    }

    if (uploadedFiles.length === 0) {
      console.error('[SCORM Upload] No files were successfully uploaded to storage');
      console.error('[SCORM Upload] File paths attempted:', filePaths.length);
      return NextResponse.json({ 
        error: "No files extracted from SCORM package",
        details: `Attempted to upload ${filePaths.length} files but none succeeded. Check storage bucket permissions.`
      }, { status: 400 });
    }

    // Find the launch file (typically index.html or the first HTML file)
    const htmlFiles = Object.keys(zipContent.files).filter(path => 
      path.toLowerCase().endsWith('.html') || path.toLowerCase().endsWith('.htm')
    );
    const launchFile = htmlFiles.find(path => 
      path.toLowerCase() === 'index.html' || 
      path.toLowerCase() === 'index.htm' ||
      path.toLowerCase().includes('launch')
    ) || htmlFiles[0] || 'index.html'; // Default fallback

    const packageUrl = `${packageFolder}/${launchFile}`;

    // Check if SCORM package already exists for this lesson
    console.log('[SCORM Upload] Checking for existing package, lessonId:', lessonId);
    const { data: existingPackage, error: checkError } = await serviceSupabase
      .from('scorm_packages')
      .select('id, package_url')
      .eq('lesson_id', lessonId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[SCORM Upload] Error checking for existing package:', checkError);
      throw checkError;
    }

    // Store SCORM package metadata in database
    const packageData = {
      lesson_id: lessonId,
      course_id: finalCourseId,
      title: titleText,
      description: description,
      scorm_version: scormVersion,
      package_url: packageUrl,
      manifest_xml: manifestXml,
      package_size: file.size,
      identifier: identifier,
      schema_version: schemaVersion || null,
      schema_location: schema || null,
      created_by: user.id
    };

    let scormPackage;
    
    if (existingPackage) {
      // Update existing package
      // Clean up old files
      if (existingPackage.package_url) {
        const oldFolder = existingPackage.package_url.split('/').slice(0, -1).join('/');
        const { data: oldFiles } = await serviceSupabase.storage
          .from('course-materials')
          .list(oldFolder);
        
        if (oldFiles && oldFiles.length > 0) {
          const oldPaths = oldFiles.map(f => `${oldFolder}/${f.name}`);
          await serviceSupabase.storage.from('course-materials').remove(oldPaths);
        }
      }

      console.log('[SCORM Upload] Updating existing package:', existingPackage.id);
      const { data: updated, error: updateError } = await serviceSupabase
        .from('scorm_packages')
        .update(packageData)
        .eq('id', existingPackage.id)
        .select()
        .single();

      if (updateError) {
        console.error('[SCORM Upload] Database update error:', updateError);
        // Clean up uploaded files
        await serviceSupabase.storage.from('course-materials').remove(uploadedFiles);
        throw updateError;
      }
      
      scormPackage = updated;
    } else {
      // Create new package
      console.log('[SCORM Upload] Inserting new package, packageData keys:', Object.keys(packageData));
      const { data: inserted, error: insertError } = await serviceSupabase
        .from('scorm_packages')
        .insert([packageData])
        .select()
        .single();

      if (insertError) {
        console.error('[SCORM Upload] Database insert error:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        // Clean up uploaded files
        await serviceSupabase.storage.from('course-materials').remove(uploadedFiles);
        throw insertError;
      }

      console.log('[SCORM Upload] Package inserted successfully:', inserted?.id);
      scormPackage = inserted;
    }

    // Update lesson content_type to 'scorm'
    console.log('[SCORM Upload] Updating lesson content_type');
    const { error: lessonUpdateError } = await serviceSupabase
      .from('lessons')
      .update({ content_type: 'scorm' })
      .eq('id', lessonId);
    
    if (lessonUpdateError) {
      console.error('[SCORM Upload] Error updating lesson:', lessonUpdateError);
      throw lessonUpdateError;
    }

    // Get public URL for the launch file
    console.log('[SCORM Upload] Getting public URL for:', packageUrl);
    const { data: urlData } = serviceSupabase.storage
      .from('course-materials')
      .getPublicUrl(packageUrl);
    
    console.log('[SCORM Upload] Success! Package URL:', urlData?.publicUrl);

    return NextResponse.json({
      success: true,
      scormPackage: {
        id: scormPackage.id,
        lesson_id: lessonId,
        title: titleText,
        scorm_version: scormVersion,
        package_url: urlData.publicUrl,
        launch_file: launchFile,
        package_size: file.size,
        files_extracted: uploadedFiles.length
      }
    });

  } catch (error: any) {
    console.error('SCORM upload error:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
      errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    return NextResponse.json({ 
      error: error?.message || "Failed to upload SCORM package",
      code: error?.code,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}

