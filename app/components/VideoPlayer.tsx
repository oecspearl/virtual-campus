"use client";

export default function VideoPlayer({ src, title }: { src: string; title?: string }) {
  const isYouTube = /youtube\.com|youtu\.be/.test(src);
  const isVimeo = /vimeo\.com/.test(src);

  // Convert YouTube URLs to embed format
  const getEmbedUrl = (url: string) => {
    if (isYouTube) {
      // Handle different YouTube URL formats
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    if (isVimeo) {
      // Handle Vimeo URLs
      const vimeoRegex = /vimeo\.com\/(\d+)/;
      const match = url.match(vimeoRegex);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    }
    return url;
  };

  if (isYouTube || isVimeo) {
    const embedUrl = getEmbedUrl(src);
    return (
      <div className="relative w-full mx-auto max-w-full">
        <div className="relative rounded-lg sm:rounded-xl overflow-hidden" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={embedUrl}
            title={title || "Video"}
            className="absolute left-0 top-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            style={{ minHeight: '200px' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto">
      <video 
        controls 
        className="w-full rounded-lg sm:rounded-xl bg-black aspect-video"
        playsInline
      >
        <source src={src} />
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
