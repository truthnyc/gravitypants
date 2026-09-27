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
    <Preview>Your Gravity Pants free trial has ended</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>Your free trial has ended</Heading>
        <Text style={brandText}>{name ? `Hi ${name}` : 'Hi there'}</Text>
        <Text style={brandText}>
          Your 15-day free trial of Gravity Pants is over. Nothing is lost — your ads, photos and
          brand kit are all still here, and you can keep editing and previewing for free.
        </Text>
        <Text style={brandText}>
          To export your videos and GIFs, pick a Simple or Business plan. It unlocks right away.
        </Text>
        <Button style={brandButton} href="https://gravitypants.com/pricing">
          Choose a Plan
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
  subject: 'Your Gravity Pants free trial has ended',
  displayName: 'Trial ended',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry
