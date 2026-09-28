import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
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
  brandLink,
  brandMain,
  brandText,
} from './brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{brandDarkModeCss}</style>
    </Head>
    <Preview>You've been invited to {siteName}</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>You've been invited</Heading>
        <Text style={brandText}>
          You've been invited to{' '}
          <Link href={siteUrl} style={brandLink}>
            <strong>{siteName}</strong>
          </Link>
          . Click the button below to accept the invite and set up your account:
        </Text>
        <Button className="dm-btn" style={brandButton} href={confirmationUrl}>
          Accept Invite
        </Button>
        <Text style={brandFooter}>
          If you weren't expecting this invite, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
