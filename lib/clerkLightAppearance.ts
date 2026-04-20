/**
 * Light Clerk UI for white / frosted auth surfaces (path-based /sign-in, /sign-up).
 */
export const clerkLightAppearance = {
  variables: {
    colorPrimary: '#7c3aed',
    colorDanger: '#dc2626',
    colorSuccess: '#059669',
    colorWarning: '#d97706',
    colorBackground: '#ffffff',
    colorInputBackground: '#f4f4f5',
    colorInputText: '#18181b',
    colorText: '#18181b',
    colorTextSecondary: '#52525b',
    colorTextOnPrimaryBackground: '#fafafa',
    colorNeutral: '#a1a1aa',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'mx-auto w-full !overflow-visible',
    card: 'shadow-none border-0 bg-transparent gap-3 [&_*]:antialiased',
    headerTitle: 'text-zinc-900 font-semibold tracking-tight',
    headerSubtitle: 'text-zinc-600 text-[13px]',
    main: 'gap-4',
    socialButtonsRoot: 'flex flex-col gap-2',
    socialButtonsBlockButton:
      'bg-white border border-zinc-300 text-zinc-900 hover:bg-zinc-50 justify-center gap-3 min-h-[2.75rem] rounded-xl shadow-sm',
    socialButtonsBlockButtonText: 'text-[14px] font-medium text-zinc-900',
    socialButtonsProviderIcon: 'size-5',
    dividerRow: 'my-2',
    dividerLine: 'bg-zinc-200',
    dividerText: 'text-zinc-500 text-xs uppercase tracking-wide',
    formFieldRow: 'gap-2',
    formFieldLabel: 'text-zinc-700 text-xs font-medium uppercase tracking-wide',
    formFieldInput:
      'bg-zinc-50 border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 rounded-xl focus:ring-2 focus:ring-violet-500/30',
    formFieldInputShowPasswordButton: 'text-zinc-500',
    formButtonPrimary:
      'bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl shadow-sm',
    formButtonReset: 'text-zinc-500',
    footer: 'text-zinc-500',
    footerActionLink: 'text-violet-700 hover:text-violet-800 font-semibold',
    footerActionText: 'text-zinc-600',
    identityPreviewText: 'text-zinc-700',
    identityPreviewEditButton: 'text-violet-600',
    formFieldSuccessText: 'text-emerald-600',
    formFieldErrorText: 'text-red-600',
    otpCodeFieldInput: 'bg-zinc-50 border-zinc-300 text-zinc-900',
    alternativeMethodsBlockButton: 'border-zinc-300 text-zinc-800 hover:bg-zinc-50',
  },
} as const;
