/**
 * Configuração Centralizada da Base URL da API
 * Missão Circuitos Elétricos 2.0
 * 
 * Permite que o frontend SPA na Vercel (ou qualquer outro hosting)
 * se comunique de forma transparente com o backend Express contínuo.
 * 
 * Se VITE_API_URL estiver definida (ex: no painel da Vercel):
 *   API_BASE_URL = VITE_API_URL (sem barra final)
 * Se estiver vazia (desenvolvimento local ou mesmo domínio):
 *   API_BASE_URL = '' (chamadas relativas /api/...)
 */

export const API_BASE_URL: string = (
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).trim()
    : ''
).replace(/\/+$/, '');

/**
 * Constrói a URL completa para um endpoint da API.
 * Preserva estritamente o path original.
 */
export function getApiUrl(endpointPath: string): string {
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
