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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{brandDarkModeCss}</style>
    </Head>
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>Confirm your email</Heading>
        <Text style={brandText}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={brandLink}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={brandText}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={brandLink}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button className="dm-btn" style={brandButton} href={confirmationUrl}>
          Verify Email
        </Button>
        <Text style={brandFooter}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
