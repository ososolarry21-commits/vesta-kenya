export default function Footer() {
  return (
    <footer style={{ 
      background: '#1C1209', 
      color: 'white', 
      padding: '40px 20px', 
      textAlign: 'center', 
      marginTop: 'auto' 
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700 }}>
        Need Help? Contact Customer Support
      </h3>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 24, 
        flexWrap: 'wrap', 
        marginBottom: 24 
      }}>
        <a 
          href="tel:0710236242" 
          style={{ 
            color: '#D4873A', 
            textDecoration: 'none', 
            fontWeight: 600, 
            fontSize: 16,
            background: 'rgba(255,255,255,0.1)',
            padding: '10px 20px',
            borderRadius: 8
          }}
        >
          📞 Safaricom: 0710 236 242
        </a>
        <a 
          href="tel:0107650275" 
          style={{ 
            color: '#D4873A', 
            textDecoration: 'none', 
            fontWeight: 600, 
            fontSize: 16,
            background: 'rgba(255,255,255,0.1)',
            padding: '10px 20px',
            borderRadius: 8
          }}
        >
           Airtel: 0107 650 275
        </a>
      </div>
      
      <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>
        © 2026 Vesta Kenya. All rights reserved.
      </p>
    </footer>
  )
}
