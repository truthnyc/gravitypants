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
    <Preview>Welcome to Gravity Pants — your free trial is ready</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>Welcome to Gravity Pants</Heading>
        <Text style={brandText}>{name ? `Hi ${name}` : 'Hi there'}</Text>
        <Text style={brandText}>
          Your free trial includes 3 exports, with no time limit and no card needed. Upload a few photos, turn them into a video ad, and
          preview it for every social channel — no editing experience needed.
        </Text>
        <Text style={brandText}>
          When you're ready to export your videos and GIFs, pick a Simple or Business plan.
        </Text>
        <Button style={brandButton} href="https://gravitypants.com/app/ads">
          Make Your First Ad
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
  subject: 'Welcome to Gravity Pants',
  displayName: 'Welcome',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry
