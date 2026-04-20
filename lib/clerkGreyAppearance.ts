/**
 * Dark grey Clerk UI — matches the app shell, keeps OAuth rows readable with provider icons (Google, etc.).
 * Typed loosely so we don’t depend on a separate `@clerk/types` package.
 */
export const clerkGreyAppearance = {
  variables: {
    colorPrimary: '#c4b5fd',
    colorDanger: '#f87171',
    colorSuccess: '#34d399',
    colorWarning: '#fbbf24',
    colorBackground: '#0f0f12',
    colorInputBackground: '#3f3f46',
    colorInputText: '#ffffff',
    colorText: '#fafafa',
    colorTextSecondary: '#d4d4d8',
    colorTextOnPrimaryBackground: '#18181b',
    colorNeutral: '#71717a',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'mx-auto w-full !overflow-visible',
    card: 'shadow-none border-0 bg-transparent gap-3 [&_*]:antialiased',
    headerTitle: 'text-zinc-50 font-semibold tracking-tight',
    headerSubtitle: 'text-zinc-300 text-[13px]',
    main: 'gap-4',
    socialButtonsRoot: 'flex flex-col gap-2',
    socialButtonsBlockButton:
      'bg-zinc-700 border border-zinc-500 text-white hover:bg-zinc-600 justify-center gap-3 min-h-[2.75rem] rounded-xl',
    socialButtonsBlockButtonText: 'text-[14px] font-medium text-white',
    socialButtonsProviderIcon: 'size-5',
    dividerRow: 'my-2',
    dividerLine: 'bg-zinc-600',
    dividerText: 'text-zinc-500 text-xs uppercase tracking-wide',
    formFieldRow: 'gap-2',
    formFieldLabel: 'text-zinc-200 text-xs font-medium uppercase tracking-wide',
    formFieldInput:
      'bg-zinc-800 border border-zinc-500 text-white placeholder:text-zinc-400 rounded-xl focus:ring-2 focus:ring-violet-400/50',
    formFieldInputShowPasswordButton: 'text-zinc-400',
    formButtonPrimary:
      'bg-violet-500 hover:bg-violet-400 text-zinc-950 font-semibold rounded-xl shadow-none',
    formButtonReset: 'text-zinc-400',
    footer: 'text-zinc-500',
    footerActionLink: 'text-violet-300 hover:text-violet-200 font-semibold',
    footerActionText: 'text-zinc-400',
    identityPreviewText: 'text-zinc-300',
    identityPreviewEditButton: 'text-violet-400',
    formFieldSuccessText: 'text-emerald-400',
    formFieldErrorText: 'text-red-400',
    otpCodeFieldInput: 'bg-zinc-800 border-zinc-600 text-white',
    alternativeMethodsBlockButton: 'border-zinc-600 text-zinc-200 hover:bg-zinc-800',
  },
} as const;
