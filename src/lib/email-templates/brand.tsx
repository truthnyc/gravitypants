import * as React from 'react'

import { Img, Section, Text } from '@react-email/components'

// Gravity Pants brand header shared by every email: blue play-mark icon + wordmark.
export const LOGO_URL =
  'https://gravitypants.com/__l5e/assets-v1/b2707cba-ba3d-470b-9199-35ebb4d1df74/gravity-pants-icon.png'

export function EmailHeader() {
  return (
    <Section style={header}>
      <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'middle' }}>
              <Img src={LOGO_URL} alt="Gravity Pants" width={28} height={28} style={logoImg} />
            </td>
            <td style={{ verticalAlign: 'middle', paddingLeft: '10px' }}>
              <Text style={wordmark}>Gravity Pants</Text>
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}

const header = { padding: '0 0 24px', textAlign: 'center' as const }
const logoImg = { display: 'block', borderRadius: '7px' }
const wordmark = {
  fontSize: '16px',
  fontWeight: 600 as const,
  letterSpacing: '-0.01em',
  color: '#1D1D1F',
  margin: 0,
}

export const brandMain = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
}
export const brandContainer = { padding: '32px 25px 20px' }
export const brandH1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1D1D1F',
  letterSpacing: '-0.02em',
  margin: '0 0 20px',
}
export const brandText = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
export const brandLink = { color: 'inherit', textDecoration: 'underline' }
export const brandButton = {
  backgroundColor: '#0071E3',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #0071E3',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
export const brandFooter = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
export const brandDarkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #0071E3 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #0071E3 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #0071E3 !important; }
`
