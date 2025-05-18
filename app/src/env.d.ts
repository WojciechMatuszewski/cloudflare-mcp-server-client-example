/// <reference types="vite/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_MCP_CLIENT_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
