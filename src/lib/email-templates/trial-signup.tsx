import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailHeader, brandContainer, brandFooter, brandH1, brandMain, brandText } from './brand'

interface Props {
  email?: string
  name?: string
  plan?: string
}

const Email = ({ email = 'someone@example.com', name, plan }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New trial signup: {email}</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>New trial signup</Heading>
        <Text style={brandText}>Email: {email}</Text>
        {name && <Text style={brandText}>Name: {name}</Text>}
        {plan && <Text style={brandText}>Plan picked at sign-up: {plan}</Text>}
        <Text style={brandFooter}>Gravity Pants — internal notification</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `New trial signup: ${String(data['email'] ?? '')}`,
  displayName: 'Trial signup alert',
  to: 'help@gravitypants.com',
  previewData: { email: 'jane@brand.com', name: 'Jane', plan: 'Business' },
} satisfies TemplateEntry
