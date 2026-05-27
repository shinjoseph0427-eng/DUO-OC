import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { C } from '../tokens';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 14, fontWeight: 800, color: C.amber, margin: '0 0 10px', letterSpacing: '0.3px' }}>
        {title}
      </p>
      <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

function Item({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
      <span style={{ color: C.amber, flexShrink: 0, marginTop: 2 }}>·</span>
      <span>{children}</span>
    </div>
  );
}

export default function PrivacyPolicyPage({ go, goBack }) {
  const handleBack = () => {
    if (goBack) goBack();
    else if (go) go('home');
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.white }}>
      {/* Header */}
      <header
        style={{
          position:     'sticky',
          top:          0,
          zIndex:       100,
          background:   C.bg,
          borderBottom: `0.5px solid ${C.border}`,
          height:       56,
          display:      'flex',
          alignItems:   'center',
          padding:      '0 16px',
          gap:          12,
        }}
      >
        <motion.button
          type="button"
          aria-label="Back"
          onClick={handleBack}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
          style={{
            width:      36,
            height:     36,
            borderRadius: 10,
            background: C.cardElevated,
            border:     `0.5px solid ${C.border}`,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor:     'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color={C.white} strokeWidth={2} />
        </motion.button>
        <p style={{ fontSize: 15, fontWeight: 800, color: C.white, margin: 0 }}>
          Privacy Policy
        </p>
      </header>

      <div style={{ padding: '28px 20px 80px', maxWidth: 640, margin: '0 auto' }}>
        {/* Title block */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 24, fontWeight: 850, color: C.white, margin: '0 0 6px', letterSpacing: '-0.4px' }}>
            Privacy Policy
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            DUO OC · Last updated June 2026
          </p>
        </div>

        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 32 }}>
          DUO OC ("we", "us", or "our") operates the DUO OC mobile application and website
          (the "Service"). This page informs you of our policies regarding the collection,
          use, and disclosure of personal data when you use our Service.
        </p>

        {/* 1 */}
        <Section title="1. Information We Collect">
          <p style={{ margin: '0 0 10px' }}>We collect the following information to provide and improve the Service:</p>
          <Item><strong style={{ color: C.white }}>Name</strong> — used to display your profile to other users.</Item>
          <Item><strong style={{ color: C.white }}>Profile photos</strong> — uploaded by you, stored securely in Supabase Storage.</Item>
          <Item><strong style={{ color: C.white }}>Birth year</strong> — used to suggest age-compatible matches.</Item>
          <Item><strong style={{ color: C.white }}>City / Location</strong> — used to show nearby duos. Exact GPS coordinates are only collected if you enable location features.</Item>
          <Item><strong style={{ color: C.white }}>Email address</strong> — used for authentication and account recovery. Never shown to other users.</Item>
          <Item><strong style={{ color: C.white }}>Instagram handle</strong> — optional. Only shared with duos you have matched and confirmed a hangout with.</Item>
          <Item><strong style={{ color: C.white }}>FCM device token</strong> — used solely to send push notifications to your device. Never shared externally.</Item>
          <Item><strong style={{ color: C.white }}>App usage data</strong> — actions within the app (e.g., matches, hangout proposals) stored to power core features.</Item>
        </Section>

        {/* 2 */}
        <Section title="2. How We Use Your Information">
          <Item>Matching you with compatible duos in Orange County.</Item>
          <Item>Sending push notifications about duo requests, hangout proposals, and confirmations.</Item>
          <Item>Displaying your profile to other authenticated users of the Service.</Item>
          <Item>Maintaining your account and authentication session.</Item>
          <Item>Improving app features and user experience over time.</Item>
          <Item>Enforcing our community guidelines and safety policies.</Item>
        </Section>

        {/* 3 */}
        <Section title="3. Third-Party Services">
          <p style={{ margin: '0 0 10px' }}>
            We share data only with the following trusted service providers, strictly to operate the Service:
          </p>
          <Item>
            <strong style={{ color: C.white }}>Supabase</strong> — database, authentication, and file storage.
            Your data is stored on Supabase-managed infrastructure. See{' '}
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.amber }}>
              supabase.com/privacy
            </a>.
          </Item>
          <Item>
            <strong style={{ color: C.white }}>Google Firebase (FCM)</strong> — push notification delivery only.
            Your FCM token is used solely to route notifications to your device. See{' '}
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.amber }}>
              firebase.google.com/support/privacy
            </a>.
          </Item>
          <p style={{ margin: '10px 0 0' }}>
            We do <strong style={{ color: C.white }}>not</strong> sell your personal data to any third party.
            We do not use your data for advertising purposes.
          </p>
        </Section>

        {/* 4 */}
        <Section title="4. Data Retention">
          <Item>Your profile and account data is retained for as long as your account is active.</Item>
          <Item>Deleted accounts are purged from our database within 30 days of deletion.</Item>
          <Item>Chat messages and hangout records are retained for 12 months after the hangout date, then automatically deleted.</Item>
          <Item>FCM tokens are overwritten each time you log in on a new device and removed when you delete your account.</Item>
        </Section>

        {/* 5 */}
        <Section title="5. Your Rights">
          <p style={{ margin: '0 0 10px' }}>You have the right to:</p>
          <Item>Access the personal data we hold about you.</Item>
          <Item>Request correction of inaccurate data.</Item>
          <Item>Request deletion of your account and all associated data.</Item>
          <Item>Withdraw consent for push notifications at any time through your device settings.</Item>
        </Section>

        {/* 6 */}
        <Section title="6. How to Delete Your Data">
          <p style={{ margin: '0 0 10px' }}>
            To request deletion of your account and all personal data:
          </p>
          <div
            style={{
              background:   C.amberT08,
              border:       `0.5px solid ${C.amberT35}`,
              borderRadius: 14,
              padding:      '14px 16px',
              margin:       '0 0 10px',
            }}
          >
            <p style={{ fontSize: 13, color: C.white, fontWeight: 700, margin: '0 0 4px' }}>
              Email us at:
            </p>
            <a
              href="mailto:team.duooc@gmail.com"
              style={{ fontSize: 14, color: C.amber, fontWeight: 700, textDecoration: 'none' }}
            >
              team.duooc@gmail.com
            </a>
          </div>
          <p>
            Include "Account Deletion Request" in the subject line and the email address associated
            with your account. We will process your request within 14 business days.
          </p>
        </Section>

        {/* 7 */}
        <Section title="7. Children's Privacy">
          <p style={{ margin: 0 }}>
            DUO OC is intended for users aged 18 and older. We do not knowingly collect personal
            information from anyone under 18. If you believe a minor has provided us with personal
            data, please contact us immediately and we will delete that information.
          </p>
        </Section>

        {/* 8 */}
        <Section title="8. Changes to This Policy">
          <p style={{ margin: 0 }}>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new policy in the app. Your continued use of the Service after changes
            are posted constitutes your acceptance of the updated policy.
          </p>
        </Section>

        {/* 9 */}
        <Section title="9. Contact Us">
          <p style={{ margin: '0 0 10px' }}>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <Item>
            <strong style={{ color: C.white }}>Email:</strong>{' '}
            <a href="mailto:team.duooc@gmail.com" style={{ color: C.amber }}>team.duooc@gmail.com</a>
          </Item>
          <Item>
            <strong style={{ color: C.white }}>App:</strong> DUO OC
          </Item>
          <Item>
            <strong style={{ color: C.white }}>Website:</strong>{' '}
            <a href="https://duo-oc.com" target="_blank" rel="noopener noreferrer" style={{ color: C.amber }}>
              duo-oc.com
            </a>
          </Item>
        </Section>

        <div
          style={{
            borderTop:   `0.5px solid ${C.border}`,
            paddingTop:  20,
            marginTop:   8,
          }}
        >
          <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            © 2026 DUO OC. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
