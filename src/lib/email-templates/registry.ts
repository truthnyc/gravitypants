import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as welcome } from './welcome'
import { template as trialEnding } from './trial-ending'
import { template as trialEnded } from './trial-ended'
import { template as planStarted } from './plan-started'
import { template as paymentFailed } from './payment-failed'
import { template as planCancelled } from './plan-cancelled'
import { template as invite } from './team-invite'
import { template as supportTicket } from './support-ticket'
import { template as brandRequest } from './brand-request'
import { template as weeklyReport } from './weekly-report'
import { template as clientInviteCopy } from './client-invite-copy'
import { template as directoryNotice } from './directory-notice'

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome,
  'trial-ending': trialEnding,
  'trial-ended': trialEnded,
  'plan-started': planStarted,
  'payment-failed': paymentFailed,
  'plan-cancelled': planCancelled,
  invite,
  'support-ticket': supportTicket,
  'brand-request': brandRequest,
  'weekly-report': weeklyReport,
  'client-invite-copy': clientInviteCopy,
  'directory-notice': directoryNotice,
}
