// layout.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/ui/sidebar'; // Caminho corrigido para a UI
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Tenta ler o estado inicial do localStorage, senão padrão para true (recolhido)
  const getInitialSidebarState = () => {
    if (typeof window !== 'undefined') {
      const storedState = localStorage.getItem('sidebarCollapsed');
      // console.log("[Layout] Stored state:", storedState);
      return storedState ? JSON.parse(storedState) : true; // Default true se não houver nada
    }
    return true; // Padrão para SSR ou caso window não esteja disponível
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true); // Inicializa com true, será atualizado no effect
  const [isMounted, setIsMounted] = useState(false); // Estado para controlar a montagem

  // Effect para definir o estado inicial após a montagem no cliente
  useEffect(() => {
    // console.log("[Layout Effect - Mount] Setting initial sidebar state from localStorage");
    setIsSidebarCollapsed(getInitialSidebarState());
    setIsMounted(true); // Marca que o componente foi montado no cliente
  }, []); // Roda apenas uma vez na montagem

  // Effect para salvar o estado no localStorage sempre que ele mudar (e o componente estiver montado)
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      // console.log("[Layout Effect - State Change] Saving sidebar state to localStorage:", isSidebarCollapsed);
      localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed, isMounted]); // Roda quando isSidebarCollapsed ou isMounted muda

  // Callback para alternar o estado da sidebar
  const toggleSidebar = useCallback(() => {
    // console.log("[Layout] toggleSidebar chamado!");
    setIsSidebarCollapsed(prevState => !prevState);
  }, []); // Não tem dependências, pode ser useCallback

  // Calcula a classe de padding baseada no estado atual
  const mainPaddingClass = isSidebarCollapsed ? "pl-16" : "pl-60";

  // console.log("[Layout] Renderizando. Colapsada?", isSidebarCollapsed, "Padding:", mainPaddingClass);

  // Evita renderizar com estado potencialmente incorreto antes da montagem do cliente
  // if (!isMounted) {
  //   console.log("[Layout] Ainda não montado, renderizando null ou placeholder");
  //   return null; // Ou um loader/placeholder se preferir
  // }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Passa o estado e a função de toggle para a Sidebar */}
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />

      {/* Conteúdo Principal com padding dinâmico e transição */}
      <main className={cn(
          "flex-1 pt-4 pb-8", // Padding vertical padrão (pode ajustar)
          mainPaddingClass, // Padding lateral dinâmico
          "transition-[padding-left] duration-300 ease-in-out" // Anima SOMENTE o padding-left
      )}>
        {/* Container interno para padding horizontal consistente */}
        <div className="px-4 md:px-6">
             {children}
        </div>
      </main>

      {/* Componente para exibir Toasts */}
       <Toaster />
    </div>
  );
};

export default Layout;