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
  planName?: string
}

const Email = ({ name, planName }: Props) => {
  const plan = planName ?? 'Business'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {plan} plan is active — exporting is unlocked</Preview>
      <Body style={brandMain}>
        <Container style={brandContainer}>
          <EmailHeader />
          <Heading style={brandH1}>{plan} is active</Heading>
          <Text style={brandText}>{name ? `Hi ${name}` : 'Hi there'}</Text>
          <Text style={brandText}>
            Thank you for choosing Gravity Pants. Your {plan} plan is now active and exporting is
            unlocked — make as many videos and GIFs as your plan allows, starting right now.
          </Text>
          <Button style={brandButton} href="https://gravitypants.com">
            Export Your Ads
          </Button>
          <Text style={brandFooter}>
            Gravity Pants · You're getting this because you have a Gravity Pants account.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `${data['planName'] ?? 'Your plan'} is active`,
  displayName: 'Plan started',
  previewData: { name: 'Jane', planName: 'Business' },
} satisfies TemplateEntry
