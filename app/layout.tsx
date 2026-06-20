import './globals.css'
import Footer from './components/Footer'

export const metadata = {
  title: 'Vesta Kenya',
  description: 'Student Accommodation Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', margin: 0 }}>
        {children}
        <Footer />
      </body>
    </html>
  )
}
