import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      // Pegando os produtos do carrinho
      const products = [...cart];
      const isInCart = products.find(value => value.id === productId);
      
      // Valor em estoque
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      // Quanto do produto tem adicionado no carrinho
      const currentAmount = isInCart ? isInCart.amount : 0;

      // Adicionei um produto no carrinho
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (isInCart) {
        isInCart.amount = amount; // Acho que já modifica dentro de products
      } else {
        const productFromApi = await api.get(`/products/${productId}`);

        const newProduct = {
          ...productFromApi.data,
          amount: 1
        }

        products.push(newProduct);
      }

      setCart(products);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));

    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const products = [...cart];
      const newProducts = products.filter(value => value.id !== productId);
      
      if (products.length !== newProducts.length){
        setCart(newProducts);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newProducts));
      } else {
        throw Error();
      }
    
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount <= 0){
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const currentStock = stock.data.amount;

      if(amount>currentStock){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const products = [...cart];
      const changedProduct = products.find(value => value.id === productId);

      if(changedProduct){
        changedProduct.amount = amount;
        setCart(products);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
