import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AuthModalProvider, useAuthModal } from './context/AuthModalContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { useAuth } from './hooks/useAuth'
import AuthModal from './components/AuthModal'
import Layout from './components/Layout'
import AdminRoute from './components/AdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'
import StorePage from './pages/StorePage'
import ProductPage from './pages/ProductPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminArtistsPage from './pages/admin/AdminArtistsPage'
import AdminFanficsPage from './pages/admin/AdminFanficsPage'
import AdminShippingPage from './pages/admin/AdminShippingPage'
import AdminBannersPage from './pages/admin/AdminBannersPage'
import AdminCollaboratorsPage from './pages/admin/AdminCollaboratorsPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminPreordersPage from './pages/admin/AdminPreordersPage'
import AdminReturnsPage from './pages/admin/AdminReturnsPage'
import AdminPromotionsPage from './pages/admin/AdminPromotionsPage'
import AdminHeroPage from './pages/admin/AdminHeroPage'
import AdminNewsletterPage from './pages/admin/AdminNewsletterPage'
import ArtistsPage from './pages/ArtistsPage'
import BolaTroncodriloPage from './pages/BolaTroncodriloPage'
import MapaTroncodriloPage from './pages/MapaTroncodriloPage'
import MiFanficPage from './pages/MiFanficPage'
import ArtistProfilePage from './pages/ArtistProfilePage'
import CheckoutSuccessPage from './pages/checkout/CheckoutSuccessPage'
import CheckoutCancelPage from './pages/checkout/CheckoutCancelPage'
import OrdersPage from './pages/OrdersPage'
import ProfilePage from './pages/ProfilePage'
import PolicyPlaceholderPage from './pages/policies/PolicyPlaceholderPage'


// Detecta el retorno de Google OAuth (?auth=success en la home), limpia la
// URL, recarga el usuario autenticado y cierra el modal si seguía abierto.
function AuthCallbackHandler() {
  const { refreshUser } = useAuth()
  const { closeModal } = useAuthModal()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, '', '/')
      refreshUser()
      closeModal()
    }
  }, [])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <CurrencyProvider>
      <AuthProvider>
      <AuthModalProvider>
        <AuthCallbackHandler />
        <Routes>
          {/* Sin layout: auth a pantalla completa */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Sin layout: 404 a pantalla completa, con su propio minijuego */}
          <Route path="*" element={<NotFoundPage />} />

          {/* Con layout: Header sticky + Footer */}
          <Route element={<Layout />}>
            <Route path="/"                element={<HomePage />} />
            <Route path="/tienda"          element={<StorePage />} />
            <Route path="/producto/:slug"  element={<ProductPage />} />
            <Route path="/artistas"          element={<ArtistsPage />} />
            <Route path="/artistas/:id"      element={<ArtistProfilePage />} />
            <Route path="/bola-troncodrilo"  element={<BolaTroncodriloPage />} />
            <Route path="/mapa-troncodrilo"  element={<MapaTroncodriloPage />} />

            <Route path="/politica-privacidad"
              element={<PolicyPlaceholderPage title="Política de privacidad" />} />
            <Route path="/politica-cookies"
              element={<PolicyPlaceholderPage title="Política de cookies" />} />
            <Route path="/terminos-condiciones"
              element={<PolicyPlaceholderPage title="Términos y condiciones" />} />
            <Route path="/politica-devoluciones"
              element={<PolicyPlaceholderPage title="Política de devoluciones" />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/perfil"              element={<ProfilePage />} />
              <Route path="/mi-fanfic"           element={<MiFanficPage />} />
              <Route path="/mis-pedidos"         element={<OrdersPage />} />
              <Route path="/checkout/exito"      element={<CheckoutSuccessPage />} />
              <Route path="/checkout/cancelado"  element={<CheckoutCancelPage />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin"           element={<AdminDashboardPage />} />
              <Route path="/admin/productos" element={<AdminProductsPage />} />
              <Route path="/admin/artistas" element={<AdminArtistsPage />} />
              <Route path="/admin/fanfics"  element={<AdminFanficsPage />} />
              <Route path="/admin/envios"         element={<AdminShippingPage />} />
              <Route path="/admin/banners"        element={<AdminBannersPage />} />
              <Route path="/admin/colaboradores"  element={<AdminCollaboratorsPage />} />
              <Route path="/admin/pedidos"        element={<AdminOrdersPage />} />
              <Route path="/admin/preorders"      element={<AdminPreordersPage />} />
              <Route path="/admin/devoluciones"  element={<AdminReturnsPage />} />
              <Route path="/admin/promociones"   element={<AdminPromotionsPage />} />
              <Route path="/admin/hero"          element={<AdminHeroPage />} />
              <Route path="/admin/newsletter"    element={<AdminNewsletterPage />} />
            </Route>
          </Route>
        </Routes>
        <AuthModal />
      </AuthModalProvider>
      </AuthProvider>
      </CurrencyProvider>
    </BrowserRouter>
  )
}

export default App
