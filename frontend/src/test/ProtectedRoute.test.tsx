import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const renderRoute = (requiredRole?: string | string[]) =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute requiredRole={requiredRole}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        {/* Catch /auth and /auth?error=... with a single route */}
        <Route path="/auth" element={<div>Auth Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  it('shows spinner while loading', () => {
    mockUseAuth.mockReturnValue({ user: null, userRole: null, loading: true, companyMismatch: false });
    const { container } = renderRoute();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects unauthenticated user to /auth', () => {
    mockUseAuth.mockReturnValue({ user: null, userRole: null, loading: false, companyMismatch: false });
    renderRoute();
    expect(screen.getByText('Auth Page')).toBeInTheDocument();
  });

  it('redirects wrong-company user to /auth', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, userRole: 'GM', loading: false, companyMismatch: true });
    renderRoute();
    expect(screen.getByText('Auth Page')).toBeInTheDocument();
  });

  it('redirects user with wrong role to home', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, userRole: 'ENGINEER', loading: false, companyMismatch: false });
    renderRoute('GM');
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders children when role matches', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, userRole: 'GM', loading: false, companyMismatch: false });
    renderRoute('GM');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when no requiredRole is specified', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, userRole: 'ENGINEER', loading: false, companyMismatch: false });
    renderRoute();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when role is in allowed array', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, userRole: 'SUPERVISOR', loading: false, companyMismatch: false });
    renderRoute(['GM', 'SUPERVISOR']);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects when role is not in allowed array', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, userRole: 'ENGINEER', loading: false, companyMismatch: false });
    renderRoute(['GM', 'SUPERVISOR']);
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });
});
