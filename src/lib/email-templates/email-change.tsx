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

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{brandDarkModeCss}</style>
    </Head>
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>Confirm your email change</Heading>
        <Text style={brandText}>
          You requested to change your email address for {siteName} from{' '}
          <Link href={`mailto:${oldEmail}`} style={brandLink}>
            {oldEmail}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={brandLink}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={brandText}>
          Click the button below to confirm this change:
        </Text>
        <Button className="dm-btn" style={brandButton} href={confirmationUrl}>
          Confirm Email Change
        </Button>
        <Text style={brandFooter}>
          If you didn't request this change, please secure your account
          immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
