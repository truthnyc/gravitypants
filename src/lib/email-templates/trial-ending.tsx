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
  daysLeft?: number
}

const Email = ({ name, daysLeft }: Props) => {
  const days = daysLeft ?? 3
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Your Gravity Pants trial ends in ${days} days`}</Preview>
      <Body style={brandMain}>
        <Container style={brandContainer}>
          <EmailHeader />
          <Heading style={brandH1}>Your trial ends in {days} days</Heading>
          <Text style={brandText}>{name ? `Hi ${name}` : 'Hi there'}</Text>
          <Text style={brandText}>
            Your free trial of Gravity Pants ends in {days} days. Everything you've made stays
            editable — but exporting videos and GIFs needs a Simple or Business plan.
          </Text>
          <Text style={brandText}>
            Pick a plan now and your exports unlock right away.
          </Text>
          <Button style={brandButton} href="https://gravitypants.com/pricing">
            See Plans
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
  subject: (data: Record<string, any>) =>
    `Your Gravity Pants trial ends in ${data['daysLeft'] ?? 3} days`,
  displayName: 'Trial ending soon',
  previewData: { name: 'Jane', daysLeft: 3 },
} satisfies TemplateEntry
