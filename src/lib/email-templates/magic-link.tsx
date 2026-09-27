import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

import {
  EmailHeader,
  brandButton,
  brandContainer,
  brandDarkModeCss,
  brandFooter,
  brandH1,
  brandMain,
  brandText,
} from './brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{brandDarkModeCss}</style>
    </Head>
    <Preview>Your login link for {siteName}</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>Your login link</Heading>
        <Text style={brandText}>
          Click the button below to log in to {siteName}. This link will expire
          shortly.
        </Text>
        <Button className="dm-btn" style={brandButton} href={confirmationUrl}>
          Log In
        </Button>
        <Text style={brandFooter}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
