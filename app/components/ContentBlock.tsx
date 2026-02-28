"use client";

import VideoPlayer from "@/app/components/VideoPlayer";
import AutoResizeTextContent from "@/app/components/AutoResizeTextContent";
import SlideshowViewer from "@/app/components/SlideshowViewer";

export type ContentItem = {
  type: "video" | "text" | "slideshow" | "file" | "embed" | "label";
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

export default function ContentBlock({ item, courseId, lessonId }: { item: ContentItem; courseId?: string; lessonId?: string }) {
  switch (item.type) {
    case "video": {
      const src = typeof item.data === "string" ? item.data : String(item.data?.url || "");
      return (
        <div className="space-y-2">
          <h5 className="text-sm text-gray-900">{item.title}</h5>
          <VideoPlayer src={src} title={item.title} />
        </div>
      );
    }
    case "embed": {
      const src = typeof item.data === "string" ? item.data : String(item.data?.url || "");
      return (
        <div className="space-y-2">
          <h5 className="text-sm text-gray-900">{item.title}</h5>
          <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingTop: "56.25%" }}>
            <iframe src={src} title={item.title} className="absolute left-0 top-0 h-full w-full" />
          </div>
        </div>
      );
    }
    case "file": {
      const fileId = String(item.data?.fileId || item.data);
      const q = new URLSearchParams();
      if (courseId) q.set("courseId", courseId);
      if (lessonId) q.set("lessonId", lessonId);
      const href = `/api/files/${fileId}?${q.toString()}`;
      return (
        <div className="space-y-1">
          <h5 className="text-sm text-gray-900">{item.title}</h5>
          <a href={href} className="text-xs text-[#3B82F6] underline"><span>Download file</span></a>
        </div>
      );
    }
    case "slideshow": {
      // Extract slideshow URL - handle both string and object formats
      let src = '';
      if (typeof item.data === 'string') {
        src = item.data;
      } else if (item.data?.url) {
        src = item.data.url;
      } else if (item.data) {
        src = String(item.data);
      }
      
      const title = item.data?.title || item.title || "Slideshow";
      const embedType = item.data?.embedType || "auto";
      
      // Only render if we have a valid URL
      if (!src || src.trim() === '' || !src.match(/^https?:\/\//i)) {
        return (
          <div className="space-y-2">
            <h5 className="text-sm text-gray-900">{title}</h5>
            <div className="text-xs text-red-600">
              No valid slideshow URL provided. Please provide a full URL starting with http:// or https://
            </div>
          </div>
        );
      }
      
      return (
        <div className="space-y-2">
          <SlideshowViewer url={src.trim()} title={title} embedType={embedType} />
        </div>
      );
    }
    case "label": {
      const text = item.data?.text || item.title || "";
      const style = item.data?.style || "heading";
      const size = item.data?.size || "medium";

      // Size classes for padding
      const paddingClasses = {
        small: "py-2 px-4",
        medium: "py-3 px-5",
        large: "py-4 px-6"
      };

      // Style-specific rendering
      if (style === "divider") {
        const dividerTextSizes = {
          small: "text-xs",
          medium: "text-sm",
          large: "text-base"
        };
        return (
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-gray-300" />
            {text && (
              <span className={`${dividerTextSizes[size as keyof typeof dividerTextSizes]} font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-white px-3`}>
                {text}
              </span>
            )}
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-300 to-gray-300" />
          </div>
        );
      }

      if (style === "section") {
        const sectionTextSizes = {
          small: "text-sm",
          medium: "text-base",
          large: "text-lg"
        };
        return (
          <div className={`relative ${paddingClasses[size as keyof typeof paddingClasses]} my-5 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-500 shadow-sm`}>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent rounded-lg" />
            <span className={`relative ${sectionTextSizes[size as keyof typeof sectionTextSizes]} font-bold text-emerald-800 flex items-center gap-2`}>
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {text}
            </span>
          </div>
        );
      }

      if (style === "banner") {
        const bannerTextSizes = {
          small: "text-sm",
          medium: "text-base",
          large: "text-lg"
        };
        return (
          <div className={`relative overflow-hidden ${paddingClasses[size as keyof typeof paddingClasses]} my-5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg`}>
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>
            <div className="relative text-center">
              <span className={`${bannerTextSizes[size as keyof typeof bannerTextSizes]} font-bold text-white drop-shadow-sm`}>
                {text}
              </span>
            </div>
          </div>
        );
      }

      // Default: heading style with attractive background
      const headingSizes = {
        small: "text-lg",
        medium: "text-xl",
        large: "text-2xl"
      };

      return (
        <div className={`relative ${paddingClasses[size as keyof typeof paddingClasses]} my-5 rounded-lg bg-gradient-to-r from-gray-50 to-slate-100 border border-gray-200 shadow-sm`}>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-l-lg" />
          <h3 className={`${headingSizes[size as keyof typeof headingSizes]} font-bold text-gray-800 pl-3`}>
            {text}
          </h3>
        </div>
      );
    }
    case "text":
    default: {
      const html = typeof item.data === "string" ? item.data : String(item.data?.html || "");
      return (
        <AutoResizeTextContent
          content={html}
          title={item.title}
          minHeight={100}
          maxHeight={1500}
          className="text-content"
        />
      );
    }
  }
}
