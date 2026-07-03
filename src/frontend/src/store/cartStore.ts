import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId:    number
  variantId?:   number       // undefined → producto sin variantes
  size?:        string
  name:         string
  slug:         string
  price:        number        // céntimos
  stock:        number
  image:        string | null // url de position=1
  categorySlug: string | null
  quantity:     number
}

interface CartStore {
  items:   CartItem[]
  isOpen:  boolean

  addItem:        (item: Omit<CartItem, 'quantity'>) => void
  removeItem:     (productId: number, variantId?: number) => void
  updateQuantity: (productId: number, quantity: number, variantId?: number) => void
  clearCart:      () => void
  openCart:       () => void
  closeCart:      () => void
  getTotalItems:  () => number
  getSubtotal:    () => number  // en céntimos
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items:  [],
      isOpen: false,

      addItem: (incoming) => {
        const { items } = get()
        const existing = items.find(
          i => i.productId === incoming.productId && i.variantId === incoming.variantId
        )

        if (existing) {
          set({
            items: items.map(i =>
              i.productId === incoming.productId && i.variantId === incoming.variantId
                ? { ...i, quantity: Math.min(i.quantity + 1, incoming.stock) }
                : i
            ),
            isOpen: true,
          })
        } else {
          set({ items: [...items, { ...incoming, quantity: 1 }], isOpen: true })
        }
      },

      removeItem: (productId, variantId?) =>
        set(s => ({
          items: s.items.filter(i => !(i.productId === productId && i.variantId === variantId))
        })),

      updateQuantity: (productId, quantity, variantId?) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        set(s => ({
          items: s.items.map(i =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity: Math.min(quantity, i.stock) }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),
      openCart:  () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getTotalItems: () => get().items.reduce((n, i) => n + i.quantity, 0),
      getSubtotal:   () => get().items.reduce((n, i) => n + i.price * i.quantity, 0),
    }),
    {
      name: 'troncodrilo_cart',
      partialize: (state) => ({ items: state.items }), // isOpen no se persiste
    }
  )
)
