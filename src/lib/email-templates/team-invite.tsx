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
  inviterName?: string
  workspaceName?: string
  acceptUrl: string
}

const Email = ({ inviterName, workspaceName, acceptUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{inviterName || 'Someone'} invited you to join {workspaceName || 'a team'} on Gravity Pants</Preview>
    <Body style={brandMain}>
      <Container style={brandContainer}>
        <EmailHeader />
        <Heading style={brandH1}>You're invited</Heading>
        <Text style={brandText}>
          {inviterName || 'A teammate'} invited you to join <strong>{workspaceName || 'their team'}</strong> on
          Gravity Pants. You'll share ads, brand kits, templates and the team's monthly exports.
        </Text>
        <Button style={brandButton} href={acceptUrl}>
          Accept Invite
        </Button>
        <Text style={brandText}>
          The link works for 7 days. Sign in (or create an account) with this email address to join.
        </Text>
        <Text style={brandFooter}>
          Gravity Pants · You're getting this because someone invited you to their team.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Join ${d['workspaceName'] || 'a team'} on Gravity Pants`,
  displayName: 'Team invite',
  previewData: { inviterName: 'Jane', workspaceName: "Jane's ads", acceptUrl: 'https://gravitypants.com' },
} satisfies TemplateEntry
