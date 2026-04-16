import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

// SCORM API Data Model mapping
const SCORM_DATA_MODEL = {
  '1.2': {
    completion: 'cmi.core.lesson_status',
    success: 'cmi.core.lesson_status',
    score: 'cmi.core.score.raw',
    max: 'cmi.core.score.max',
    min: 'cmi.core.score.min',
    time: 'cmi.core.total_time',
    entry: 'cmi.core.entry',
    exit: 'cmi.core.exit',
    location: 'cmi.core.lesson_location',
    suspend: 'cmi.suspend_data'
  },
  '2004': {
    completion: 'cmi.completion_status',
    success: 'cmi.success_status',
    score: 'cmi.score.raw',
    max: 'cmi.score.max',
    min: 'cmi.score.min',
    scaled: 'cmi.score.scaled',
    time: 'cmi.total_time',
    sessionTime: 'cmi.session_time',
    entry: 'cmi.entry',
    exit: 'cmi.exit',
    location: 'cmi.location',
    suspend: 'cmi.suspend_data',
    progress: 'cmi.progress_measure'
  }
};

// Helper to parse SCORM time format (PT4H18M23S)
function parseSCORMTime(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  
  const match = timeStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseFloat(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + Math.floor(seconds);
}

// Helper to format seconds to SCORM time format
function formatSCORMTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  let timeStr = 'PT';
  if (hours > 0) timeStr += `${hours}H`;
  if (minutes > 0) timeStr += `${minutes}M`;
  if (secs > 0) timeStr += `${Math.floor(secs)}S`;
  
  return timeStr || 'PT0S';
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      // Return SCORM-compatible error so the player doesn't crash
      return NextResponse.json({
        result: "false",
        error: authResult.error || "Authentication failed",
        scorm_error_code: "101"
      }, { status: 401 });
    }
    const user = authResult.userProfile!;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        result: "false",
        error: "Invalid request body",
        scorm_error_code: "201"
      }, { status: 400 });
    }

    const {
      action,
      scormPackageId,
      element,
      value,
      courseId,
      lessonId
    } = body;

    if (!scormPackageId) {
      return NextResponse.json({ result: "false", error: "scormPackageId is required", scorm_error_code: "201" }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ result: "false", error: "action is required", scorm_error_code: "201" }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Get SCORM package info
    const { data: scormPackage, error: packageError } = await serviceSupabase
      .from('scorm_packages')
      .select('id, scorm_version, lesson_id, course_id')
      .eq('id', scormPackageId)
      .single();

    if (packageError || !scormPackage) {
      return NextResponse.json({ error: "SCORM package not found" }, { status: 404 });
    }

    const scormVersion = scormPackage.scorm_version;
    const finalCourseId = courseId || scormPackage.course_id;
    const finalLessonId = lessonId || scormPackage.lesson_id;
    const dataModel = SCORM_DATA_MODEL[scormVersion as '1.2' | '2004'] as any;

    // Get or create tracking record
    let { data: tracking, error: trackingError } = await serviceSupabase
      .from('scorm_tracking')
      .select('*')
      .eq('student_id', user.id)
      .eq('scorm_package_id', scormPackageId)
      .single();

    // Handle SCORM API actions
    switch (action) {
      case 'Initialize': {
        if (!tracking) {
          // Create new tracking record
          const { data: newTracking, error: createError } = await serviceSupabase
            .from('scorm_tracking')
            .insert([{
              student_id: user.id,
              scorm_package_id: scormPackageId,
              course_id: finalCourseId,
              lesson_id: finalLessonId,
              entry: 'ab-initio',
              completion_status: 'not attempted',
              attempts: 1
            }])
            .select()
            .single();

          if (createError) {
            return NextResponse.json({ 
              error: "Failed to initialize tracking",
              scorm_error_code: "101"
            }, { status: 500 });
          }

          tracking = newTracking;
        } else {
          // Update entry and last accessed
          const { data: updated, error: updateError } = await serviceSupabase
            .from('scorm_tracking')
            .update({
              entry: tracking.entry || 'resume',
              last_accessed: new Date().toISOString()
            })
            .eq('id', tracking.id)
            .select()
            .single();

          if (updateError) {
            return NextResponse.json({ 
              error: "Failed to update tracking",
              scorm_error_code: "101"
            }, { status: 500 });
          }

          tracking = updated;
        }

        return NextResponse.json({
          result: "true",
          scorm_error_code: "0"
        });
      }

      case 'GetValue': {
        if (!element) {
          return NextResponse.json({
            result: "false",
            error: "element is required",
            scorm_error_code: "201"
          }, { status: 400 });
        }

        if (!tracking) {
          // Return empty values instead of erroring — SCORM player may call GetValue before Initialize
          return NextResponse.json({
            result: "",
            scorm_error_code: "0"
          });
        }

        let result = '';
        let errorCode = '0';

        // Map SCORM data model elements to database fields
        if (element === dataModel.completion) {
          result = tracking.completion_status || 'unknown';
        } else if (element === dataModel.success) {
          result = tracking.success_status || 'unknown';
        } else if (element === dataModel.score) {
          result = tracking.score_raw?.toString() || '';
        } else if (element === dataModel.max) {
          result = tracking.score_max?.toString() || '';
        } else if (element === dataModel.min) {
          result = tracking.score_min?.toString() || '';
        } else if (element === dataModel.scaled && scormVersion === '2004') {
          result = tracking.score_scaled?.toString() || '';
        } else if (element === dataModel.time || element === dataModel.sessionTime) {
          if (scormVersion === '2004' && element === dataModel.sessionTime) {
            result = formatSCORMTime(tracking.session_time || 0);
          } else {
            result = tracking.total_time || formatSCORMTime(tracking.time_spent || 0);
          }
        } else if (element === dataModel.entry) {
          result = tracking.entry || 'ab-initio';
        } else if (element === dataModel.exit) {
          result = tracking.exit || '';
        } else if (element === dataModel.location) {
          result = tracking.location || '';
        } else if (element === dataModel.suspend) {
          result = tracking.suspend_data || '';
        } else if (element === dataModel.progress && scormVersion === '2004') {
          result = tracking.progress_measure?.toString() || '';
        } else if (element === 'cmi.core.student_id' || element === 'cmi.learner_id') {
          result = user.id;
        } else if (element === 'cmi.core.student_name' || element === 'cmi.learner_name') {
          result = user.name || user.email || '';
        } else {
          errorCode = '401'; // Invalid data model element
        }

        return NextResponse.json({
          result: result,
          scorm_error_code: errorCode
        });
      }

      case 'SetValue': {
        if (!element || value === undefined) {
          return NextResponse.json({ 
            error: "element and value are required",
            scorm_error_code: "201"
          }, { status: 400 });
        }

        if (!tracking) {
          // Create tracking record if it doesn't exist
          const { data: newTracking, error: createError } = await serviceSupabase
            .from('scorm_tracking')
            .insert([{
              student_id: user.id,
              scorm_package_id: scormPackageId,
              course_id: finalCourseId,
              lesson_id: finalLessonId,
              entry: 'ab-initio',
              completion_status: 'not attempted',
              attempts: 1
            }])
            .select()
            .single();

          if (createError) {
            return NextResponse.json({ 
              error: "Failed to create tracking",
              scorm_error_code: "101"
            }, { status: 500 });
          }

          tracking = newTracking;
        }

        // Build update object based on element
        const updateData: any = {
          last_accessed: new Date().toISOString(),
          last_saved: new Date().toISOString()
        };

        if (element === dataModel.completion) {
          updateData.completion_status = value;
        } else if (element === dataModel.success) {
          updateData.success_status = value;
        } else if (element === dataModel.score) {
          updateData.score_raw = parseFloat(value) || null;
        } else if (element === dataModel.max) {
          updateData.score_max = parseFloat(value) || null;
        } else if (element === dataModel.min) {
          updateData.score_min = parseFloat(value) || null;
        } else if (element === dataModel.scaled && scormVersion === '2004') {
          updateData.score_scaled = parseFloat(value) || null;
        } else if (element === dataModel.time) {
          updateData.time_spent = parseSCORMTime(value);
          updateData.total_time = value;
        } else if (element === dataModel.sessionTime && scormVersion === '2004') {
          updateData.session_time = parseSCORMTime(value);
          // Add to total time spent
          updateData.time_spent = (tracking.time_spent || 0) + parseSCORMTime(value);
        } else if (element === dataModel.entry) {
          updateData.entry = value;
        } else if (element === dataModel.exit) {
          updateData.exit = value;
        } else if (element === dataModel.location) {
          updateData.location = value;
        } else if (element === dataModel.suspend) {
          updateData.suspend_data = value;
        } else if (element === dataModel.progress && scormVersion === '2004') {
          updateData.progress_measure = parseFloat(value) || null;
        }

        // Update tracking record
        const { error: updateError } = await serviceSupabase
          .from('scorm_tracking')
          .update(updateData)
          .eq('id', tracking.id);

        if (updateError) {
          return NextResponse.json({ 
            error: "Failed to update tracking",
            scorm_error_code: "101"
          }, { status: 500 });
        }

        return NextResponse.json({
          result: "true",
          scorm_error_code: "0"
        });
      }

      case 'Commit': {
        if (!tracking) {
          // Silently succeed — nothing to commit if not initialized
          return NextResponse.json({
            result: "true",
            scorm_error_code: "0"
          });
        }

        // Update last saved timestamp
        await serviceSupabase
          .from('scorm_tracking')
          .update({ last_saved: new Date().toISOString() })
          .eq('id', tracking.id);

        return NextResponse.json({
          result: "true",
          scorm_error_code: "0"
        });
      }

      case 'GetLastError': {
        return NextResponse.json({
          result: "0",
          scorm_error_code: "0"
        });
      }

      case 'GetErrorString': {
        const errorString = body.errorCode === '0' ? 'No error' : 
                          body.errorCode === '101' ? 'General exception' :
                          body.errorCode === '201' ? 'Invalid argument' :
                          body.errorCode === '301' ? 'No error' :
                          body.errorCode === '401' ? 'Invalid data model element' :
                          'Unknown error';

        return NextResponse.json({
          result: errorString,
          scorm_error_code: "0"
        });
      }

      case 'GetDiagnostic': {
        return NextResponse.json({
          result: "No diagnostic information available",
          scorm_error_code: "0"
        });
      }

      case 'Terminate': {
        if (!tracking) {
          // Silently succeed — nothing to terminate if not initialized
          return NextResponse.json({
            result: "true",
            scorm_error_code: "0"
          });
        }

        // Final save
        await serviceSupabase
          .from('scorm_tracking')
          .update({
            last_saved: new Date().toISOString(),
            last_accessed: new Date().toISOString()
          })
          .eq('id', tracking.id);

        return NextResponse.json({
          result: "true",
          scorm_error_code: "0"
        });
      }

      default:
        return NextResponse.json({ 
          error: `Unknown action: ${action}`,
          scorm_error_code: "201"
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('SCORM Runtime API error:', error);
    return NextResponse.json({
      result: "false",
      error: error.message || "Internal server error",
      scorm_error_code: "101"
    }, { status: 500 });
  }
}

