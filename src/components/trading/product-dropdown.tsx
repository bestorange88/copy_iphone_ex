

import { useState } from "react"
import { ChevronDown, Check } from "lucide-react"

interface Product {
  id: string
  name: string
  code: string
}

const products: Product[] = [
  { id: "xau", name: "London Gold", code: "XAU" },
  { id: "xag", name: "London Silver", code: "XAG" },
  { id: "cl", name: "WTI Oil", code: "CL" },
  { id: "ng", name: "Natural Gas Futures", code: "NG" },
  { id: "hg", name: "COMEX Copper", code: "HG" },
]

interface ProductDropdownProps {
  selected: string
  onSelect: (product: Product) => void
}

export function ProductDropdown({ selected, onSelect }: ProductDropdownProps) {
  const [open, setOpen] = useState(false)
  
  const selectedProduct = products.find(p => p.name === selected) || products[1]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-foreground font-medium"
      >
        {selected}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      
      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[#1e293b] border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  onSelect(product)
                  setOpen(false)
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#334155] transition-colors"
              >
                <div className="text-left">
                  <div className="text-foreground font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{product.code}</div>
                </div>
                {selectedProduct.id === product.id && (
                  <Check className="w-4 h-4 text-[#22c55e]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
