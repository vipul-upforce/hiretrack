export interface IEmailTemplate {
    templateId: string
    templateName: string
    subject: string
    html: string
    variables ?: string[]
  }

export interface IEmailTemplatesConfig {
    templates: {
      [key: string]: IEmailTemplate
    }
  }
