import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailHeader, brandButton, brandContainer, brandFooter, brandH1, brandMain, brandText } from './brand'

interface Props { workspaceName?: string; used?: string; limit?: string; percent?: number }

const Email = ({ workspaceName, used = '4.0 GB', limit = '5 GB', percent = 80 }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have used {String(percent)}% of your storage</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>Your storage is {String(percent)}% full</Heading>
        <Text style={brandText}>
          {workspaceName ? `${workspaceName} is` : 'Your workspace is'} using {used} of its {limit} storage.
        </Text>
        <Text style={brandText}>
          To keep room for new photos and exports, free up space by deleting old photos and exports, or add 10 GB for $5 a month.
        </Text>
        <Button style={brandButton} href="https://gravitypants.com/app/storage">Free up space</Button>
        <Text style={brandText}>
          Prefer more room? <a href="https://gravitypants.com/app/account/billing#storage">Add storage</a>
        </Text>
        <Text style={brandFooter}>Gravity Pants · You're getting this because you own a Gravity Pants workspace.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Your Gravity Pants storage is ${d['percent'] ?? 80}% full`,
  displayName: 'Storage warning',
  previewData: { workspaceName: "Jane's ads", used: '4.1 GB', limit: '5 GB', percent: 82 },
} satisfies TemplateEntry
