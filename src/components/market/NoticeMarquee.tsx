import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notice {
  id: string;
  content: string;
  link_url: string | null;
}

export const NoticeMarquee = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('platform_notices')
      .select('id, content, link_url')
      .eq('is_active', true)
      .or(`start_time.is.null,start_time.lte.${now}`)
      .or(`end_time.is.null,end_time.gte.${now}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notices:', error);
      return;
    }

    setNotices(data || []);
  };

  if (notices.length === 0) return null;

  // 合併所有公告內容
  const combinedContent = notices.map(n => n.content).join('　　　　');

  const handleClick = (notice: Notice) => {
    if (notice.link_url) {
      window.open(notice.link_url, '_blank');
    }
  };

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg overflow-hidden">
      <div 
        className="flex items-center gap-3 px-3 py-2"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* 圖標 */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary hidden sm:inline">公告</span>
        </div>

        {/* 分隔線 */}
        <div className="w-px h-4 bg-primary/30 flex-shrink-0" />

        {/* 跑馬燈容器 */}
        <div className="flex-1 overflow-hidden relative">
          <div 
            ref={scrollRef}
            className={cn(
              "whitespace-nowrap inline-block",
              !isPaused && "animate-marquee"
            )}
            style={{
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
          >
            {/* 內容重複兩次以實現無縫滾動 */}
            <span className="inline-block">
              {notices.map((notice, index) => (
                <span
                  key={notice.id}
                  className={cn(
                    "text-sm text-foreground mx-8",
                    notice.link_url && "cursor-pointer hover:text-primary transition-colors"
                  )}
                  onClick={() => handleClick(notice)}
                >
                  {notice.content}
                  {index < notices.length - 1 && (
                    <span className="text-primary/50 mx-4">|</span>
                  )}
                </span>
              ))}
            </span>
            <span className="inline-block">
              {notices.map((notice, index) => (
                <span
                  key={`${notice.id}-dup`}
                  className={cn(
                    "text-sm text-foreground mx-8",
                    notice.link_url && "cursor-pointer hover:text-primary transition-colors"
                  )}
                  onClick={() => handleClick(notice)}
                >
                  {notice.content}
                  {index < notices.length - 1 && (
                    <span className="text-primary/50 mx-4">|</span>
                  )}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* 跑馬燈動畫樣式 */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
};
