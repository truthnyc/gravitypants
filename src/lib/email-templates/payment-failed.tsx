import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  EmailHeader,
  brandButton,
  brandContainer,
  brandFooter,
  brandH1,
  brandMain,
  brandText,
} from './brand'

interface Props {
  name?: string
}

const Email = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We couldn't take your last payment — please update your card</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>We couldn't take your last payment</Heading>
        <Text style={brandText}>{name ? `Hi ${name}` : 'Hi there'}</Text>
        <Text style={brandText}>
          The latest payment for your Gravity Pants plan didn't go through. This can happen when a
          card expires or your bank needs a confirmation.
        </Text>
        <Text style={brandText}>
          Please update your card to keep exporting your videos and GIFs without interruption.
        </Text>
        <Button style={brandButton} href="https://gravitypants.com/account/billing">
          Update Your Card
        </Button>
        <Text style={brandFooter}>
          Gravity Pants · You're getting this because you have a Gravity Pants account.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: "We couldn't take your last payment",
  displayName: 'Payment failed',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry
