import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Test basic Supabase connection
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        status: "error",
        message: "Database connection failed",
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: "ok",
      message: "API is healthy",
      timestamp: new Date().toISOString(),
      database: "connected"
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: "Health check failed",
      error: error.message
    }, { status: 500 });
  }
}