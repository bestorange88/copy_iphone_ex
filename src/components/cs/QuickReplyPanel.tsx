import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, Zap, Tag } from "lucide-react";

interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface QuickReplyPanelProps {
  quickReplies: QuickReply[];
  onSelect: (content: string) => void;
  onClose: () => void;
}

const QuickReplyPanel = ({ quickReplies, onSelect, onClose }: QuickReplyPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    quickReplies.forEach((reply) => {
      if (reply.category) {
        cats.add(reply.category);
      }
    });
    return Array.from(cats);
  }, [quickReplies]);

  // Filter quick replies based on search and category
  const filteredReplies = useMemo(() => {
    return quickReplies.filter((reply) => {
      const matchesSearch =
        !searchQuery ||
        reply.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reply.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || reply.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [quickReplies, searchQuery, selectedCategory]);

  const handleSelect = (content: string) => {
    onSelect(content);
  };

  return (
    <div className="mb-2 p-3 bg-muted/80 backdrop-blur rounded-lg border border-border shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">快捷回复</span>
          <Badge variant="secondary" className="text-xs">
            {filteredReplies.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索快捷回复..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 text-sm"
        />
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            全部
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {/* Quick Reply List */}
      <ScrollArea className="max-h-48">
        {filteredReplies.length > 0 ? (
          <div className="grid gap-1">
            {filteredReplies.map((reply) => (
              <div
                key={reply.id}
                className="group p-2 rounded-md hover:bg-background cursor-pointer transition-colors border border-transparent hover:border-border"
                onClick={() => handleSelect(reply.content)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {reply.title}
                      </span>
                      {reply.category && (
                        <Badge variant="outline" className="text-xs h-4 px-1.5">
                          {reply.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {reply.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    使用
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {searchQuery || selectedCategory
              ? "未找到匹配的快捷回复"
              : "暂无快捷回复"}
          </div>
        )}
      </ScrollArea>

      {/* Tip */}
      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          💡 点击快捷回复即可快速填入输入框
        </p>
      </div>
    </div>
  );
};

export default QuickReplyPanel;
