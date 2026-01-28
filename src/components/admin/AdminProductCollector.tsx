import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Search, Download, RefreshCw, Eye, Check, X, 
  ShoppingBag, Image as ImageIcon, DollarSign, Tag,
  Loader2, ExternalLink, Package, Star
} from "lucide-react";

interface CollectedProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  brand: string;
  category: string;
  thumbnail: string;
  images: string[];
}

interface SavedProduct {
  id: string;
  external_id: number;
  title: string;
  description: string;
  price: number;
  original_price: number;
  discount_percentage: number;
  rating: number;
  stock: number;
  brand: string;
  category: string;
  thumbnail: string;
  images: string[];
  source: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "all", label: "全部分類" },
  { value: "smartphones", label: "智能手機" },
  { value: "laptops", label: "筆記本電腦" },
  { value: "fragrances", label: "香水" },
  { value: "skincare", label: "護膚品" },
  { value: "groceries", label: "食品雜貨" },
  { value: "home-decoration", label: "家居裝飾" },
  { value: "furniture", label: "家具" },
  { value: "tops", label: "上衣" },
  { value: "womens-dresses", label: "女裝連衣裙" },
  { value: "womens-shoes", label: "女鞋" },
  { value: "mens-shirts", label: "男士襯衫" },
  { value: "mens-shoes", label: "男鞋" },
  { value: "mens-watches", label: "男士手錶" },
  { value: "womens-watches", label: "女士手錶" },
  { value: "womens-bags", label: "女包" },
  { value: "womens-jewellery", label: "女士珠寶" },
  { value: "sunglasses", label: "太陽鏡" },
  { value: "automotive", label: "汽車配件" },
  { value: "motorcycle", label: "摩托車配件" },
  { value: "lighting", label: "燈具" },
];

const AdminProductCollector = () => {
  const [collectedProducts, setCollectedProducts] = useState<CollectedProduct[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [previewProduct, setPreviewProduct] = useState<CollectedProduct | null>(null);
  const [activeTab, setActiveTab] = useState("collect");

  useEffect(() => {
    loadSavedProducts();
  }, []);

  const loadSavedProducts = () => {
    const saved = localStorage.getItem('collected_products');
    if (saved) {
      setSavedProducts(JSON.parse(saved));
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = 'https://dummyjson.com/products';
      
      if (selectedCategory !== "all") {
        url = `https://dummyjson.com/products/category/${selectedCategory}`;
      } else if (searchQuery) {
        url = `https://dummyjson.com/products/search?q=${encodeURIComponent(searchQuery)}`;
      } else {
        url = 'https://dummyjson.com/products?limit=100';
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      setCollectedProducts(data.products || []);
      toast.success(`成功採集 ${data.products?.length || 0} 個商品`);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('採集商品失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === collectedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(collectedProducts.map(p => p.id)));
    }
  };

  const handleSaveSelected = () => {
    if (selectedProducts.size === 0) {
      toast.error('請先選擇要保存的商品');
      return;
    }

    setSaving(true);
    try {
      const productsToSave = collectedProducts
        .filter(p => selectedProducts.has(p.id))
        .map(p => ({
          id: `prod_${Date.now()}_${p.id}`,
          external_id: p.id,
          title: p.title,
          description: p.description,
          price: p.price * (1 - p.discountPercentage / 100),
          original_price: p.price,
          discount_percentage: p.discountPercentage,
          rating: p.rating,
          stock: p.stock,
          brand: p.brand,
          category: p.category,
          thumbnail: p.thumbnail,
          images: p.images,
          source: 'dummyjson',
          is_active: true,
          created_at: new Date().toISOString(),
        }));

      const existingIds = new Set(savedProducts.map(p => p.external_id));
      const newProducts = productsToSave.filter(p => !existingIds.has(p.external_id));
      
      if (newProducts.length === 0) {
        toast.warning('所選商品已全部存在');
        setSaving(false);
        return;
      }

      const updatedSaved = [...savedProducts, ...newProducts];
      localStorage.setItem('collected_products', JSON.stringify(updatedSaved));
      setSavedProducts(updatedSaved);
      setSelectedProducts(new Set());
      
      toast.success(`成功保存 ${newProducts.length} 個商品`);
    } catch (error) {
      console.error('Error saving products:', error);
      toast.error('保存商品失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSaved = (productId: string) => {
    const updated = savedProducts.filter(p => p.id !== productId);
    localStorage.setItem('collected_products', JSON.stringify(updated));
    setSavedProducts(updated);
    toast.success('商品已刪除');
  };

  const handleToggleActive = (productId: string) => {
    const updated = savedProducts.map(p => 
      p.id === productId ? { ...p, is_active: !p.is_active } : p
    );
    localStorage.setItem('collected_products', JSON.stringify(updated));
    setSavedProducts(updated);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getCategoryLabel = (category: string) => {
    const found = CATEGORIES.find(c => c.value === category);
    return found?.label || category;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="collect">
            <Download className="h-4 w-4 mr-2" />
            商品採集
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Package className="h-4 w-4 mr-2" />
            已保存商品 ({savedProducts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collect" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                商品採集
              </CardTitle>
              <CardDescription>
                從外部數據源採集真實商品信息，包含圖片、詳情和價格
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label>搜索商品</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="輸入商品關鍵詞..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                    />
                    <Button onClick={fetchProducts} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="w-[200px]">
                  <Label>商品分類</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={fetchProducts} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    開始採集
                  </Button>
                </div>
              </div>

              {collectedProducts.length > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedProducts.size === collectedProducts.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      已選擇 {selectedProducts.size} / {collectedProducts.length} 個商品
                    </span>
                  </div>
                  <Button 
                    onClick={handleSaveSelected} 
                    disabled={selectedProducts.size === 0 || saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    保存選中商品
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {collectedProducts.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <ScrollArea className="h-[600px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {collectedProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`border rounded-lg overflow-hidden transition-all ${
                          selectedProducts.has(product.id) 
                            ? 'ring-2 ring-primary border-primary' 
                            : 'hover:border-primary/50'
                        }`}
                      >
                        <div className="relative aspect-square bg-muted">
                          <img
                            src={product.thumbnail}
                            alt={product.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=No+Image';
                            }}
                          />
                          <div className="absolute top-2 left-2">
                            <Checkbox
                              checked={selectedProducts.has(product.id)}
                              onCheckedChange={() => handleSelectProduct(product.id)}
                            />
                          </div>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => setPreviewProduct(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {product.discountPercentage > 0 && (
                            <Badge className="absolute bottom-2 left-2 bg-red-500">
                              -{Math.round(product.discountPercentage)}%
                            </Badge>
                          )}
                        </div>
                        <div className="p-3 space-y-2">
                          <h3 className="font-medium text-sm line-clamp-2">{product.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(product.category)}
                            </Badge>
                            {product.brand && (
                              <Badge variant="secondary" className="text-xs">
                                {product.brand}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-lg font-bold text-primary">
                                {formatPrice(product.price * (1 - product.discountPercentage / 100))}
                              </span>
                              {product.discountPercentage > 0 && (
                                <span className="text-xs text-muted-foreground line-through ml-2">
                                  {formatPrice(product.price)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="h-3 w-3 fill-current" />
                              <span className="text-xs">{product.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            庫存: {product.stock}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {!loading && collectedProducts.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>點擊「開始採集」按鈕獲取商品數據</p>
                <p className="text-sm mt-2">支持按分類或關鍵詞搜索</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                已保存商品
              </CardTitle>
              <CardDescription>
                管理已採集保存的商品，可啟用/停用或刪除
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedProducts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">圖片</TableHead>
                      <TableHead>商品名稱</TableHead>
                      <TableHead>分類</TableHead>
                      <TableHead>品牌</TableHead>
                      <TableHead>價格</TableHead>
                      <TableHead>評分</TableHead>
                      <TableHead>庫存</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <img
                            src={product.thumbnail}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="font-medium line-clamp-2">{product.title}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryLabel(product.category)}</Badge>
                        </TableCell>
                        <TableCell>{product.brand || '-'}</TableCell>
                        <TableCell>
                          <div className="font-bold text-primary">{formatPrice(product.price)}</div>
                          {product.discount_percentage > 0 && (
                            <div className="text-xs text-muted-foreground line-through">
                              {formatPrice(product.original_price)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            {product.rating.toFixed(1)}
                          </div>
                        </TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "啟用" : "停用"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(product.id)}
                              title={product.is_active ? "停用" : "啟用"}
                            >
                              {product.is_active ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSaved(product.id)}
                              className="text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暫無已保存的商品</p>
                  <p className="text-sm mt-2">請先從「商品採集」頁面採集並保存商品</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewProduct} onOpenChange={() => setPreviewProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {previewProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{previewProduct.title}</DialogTitle>
                <DialogDescription>
                  商品詳情預覽
                </DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img
                      src={previewProduct.thumbnail}
                      alt={previewProduct.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {previewProduct.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {previewProduct.images.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="aspect-square bg-muted rounded overflow-hidden">
                          <img
                            src={img}
                            alt={`${previewProduct.title} ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{getCategoryLabel(previewProduct.category)}</Badge>
                      {previewProduct.brand && (
                        <Badge variant="secondary">{previewProduct.brand}</Badge>
                      )}
                    </div>
                    <h2 className="text-xl font-bold">{previewProduct.title}</h2>
                  </div>
                  
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-primary">
                      {formatPrice(previewProduct.price * (1 - previewProduct.discountPercentage / 100))}
                    </span>
                    {previewProduct.discountPercentage > 0 && (
                      <>
                        <span className="text-lg text-muted-foreground line-through">
                          {formatPrice(previewProduct.price)}
                        </span>
                        <Badge className="bg-red-500">
                          -{Math.round(previewProduct.discountPercentage)}%
                        </Badge>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{previewProduct.rating.toFixed(1)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      庫存: {previewProduct.stock}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">商品描述</h3>
                    <p className="text-sm text-muted-foreground">
                      {previewProduct.description}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">商品圖片 ({previewProduct.images.length})</h3>
                    <div className="flex flex-wrap gap-2">
                      {previewProduct.images.map((img, idx) => (
                        <a
                          key={idx}
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ImageIcon className="h-3 w-3" />
                          圖片 {idx + 1}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        handleSelectProduct(previewProduct.id);
                        setPreviewProduct(null);
                      }}
                    >
                      {selectedProducts.has(previewProduct.id) ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          取消選擇
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          選擇此商品
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductCollector;
