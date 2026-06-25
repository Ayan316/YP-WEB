'use client'

// Inline document viewer for the resource "document" / "pdf" slides. Uses
// @cyntler/react-doc-viewer to render PDF and DOC/DOCX directly in the page
// (never a new tab). The built-in header is disabled for a clean, full-bleed
// view; a small floating Download button keeps the file accessible. Themed to
// match the site's dark / light mode.
import DocViewer, {
  DocViewerRenderers,
  type IDocument,
  type ITheme,
} from '@cyntler/react-doc-viewer'
import '@cyntler/react-doc-viewer/dist/index.css'
import { Download } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import styles from '@/moduleCss/resources.module.css'

interface ResourceDocumentViewerProps {
  url: string
  title?: string
}

const extOf = (url: string): string =>
  (url.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase()

// Same-origin proxy for the storage file (bypasses the bucket's missing CORS
// headers for in-browser fetches). `download=1` streams it as an attachment.
const proxied = (u: string, download = false): string =>
  `/api/resource-file?url=${encodeURIComponent(u)}${download ? '&download=1' : ''}`

// Office formats are rendered via the MS Office Online iframe, which fetches the
// file server-side from a PUBLIC url — keep the original for those.
const OFFICE_EXTS = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']

const DARK_THEME: ITheme = {
  primary: '#1e293b',
  secondary: '#334155',
  tertiary: '#5b8cff',
  textPrimary: '#ffffff',
  textSecondary: '#a0aec0',
  disableThemeScrollbar: false,
}

const LIGHT_THEME: ITheme = {
  primary: '#ffffff',
  secondary: '#eef2f7',
  tertiary: '#155dfc',
  textPrimary: '#0f172b',
  textSecondary: '#62748e',
  disableThemeScrollbar: false,
}

const ResourceDocumentViewer = ({ url, title }: ResourceDocumentViewerProps) => {
  const { resolvedTheme } = useTheme()
  const ext = extOf(url)
  const isOffice = OFFICE_EXTS.includes(ext)
  const isPdf = ext === 'pdf'

  // PDFs render in the browser's NATIVE pdf viewer via a same-origin <iframe>.
  // We deliberately avoid react-doc-viewer's PDF renderer here because it loads
  // its pdf.js worker from a CDN (unpkg); when that worker fails to load the
  // pages render blank even though the document parses ("2/2" but no content).
  // The native viewer needs no worker and is far more reliable.
  if (isPdf) {
    return (
      <div className={styles.doc_viewer}>
        <a
          className={styles.doc_viewer_dl}
          href={proxied(url, true)}
          aria-label={`Download ${title || 'document'}`}
          title="Download"
        >
          <Download size={16} />
        </a>
        <iframe
          className={styles.doc_viewer_frame}
          src={`${proxied(url)}#view=FitH`}
          title={title || 'PDF document'}
        />
      </div>
    )
  }

  // Office docs → original public url (MS Office Online iframe fetches it
  // server-side); other types (text/csv) → same-origin proxy to dodge CORS.
  const viewUri = isOffice ? url : proxied(url)

  const documents: IDocument[] = [
    { uri: viewUri, fileName: title, fileType: ext || undefined },
  ]

  return (
    <div className={styles.doc_viewer}>
      <a
        className={styles.doc_viewer_dl}
        href={proxied(url, true)}
        aria-label={`Download ${title || 'document'}`}
        title="Download"
      >
        <Download size={16} />
      </a>
      <DocViewer
        documents={documents}
        pluginRenderers={DocViewerRenderers}
        theme={resolvedTheme === 'light' ? LIGHT_THEME : DARK_THEME}
        config={{
          header: { disableHeader: true },
          pdfZoom: { defaultZoom: 1, zoomJump: 0.2 },
          pdfVerticalScrollByDefault: true,
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

export default ResourceDocumentViewer
