import {
  IconShield,
  IconClose,
  IconCheckCircle,
  IconAlertTriangle,
  IconInfo,
  IconZap
} from './icons';

export default function SecurityScorecardModal({
  isOpen,
  onClose,
  securityData
}) {
  if (!isOpen || !securityData) return null;

  const { score, grade, gradeColor, findings, recommendations } = securityData;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-bubble" style={{ background: 'var(--bento-accent-soft)', color: 'var(--bento-accent)' }}>
              <IconShield size={16} />
            </div>
            <div>
              <h3 className="modal-title">Security & Privacy Health Scorecard</h3>
              <div className="modal-subtitle">Audit of account security, 2FA status, and data exposure</div>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconClose size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Hero Score Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderRadius: 'var(--bento-radius-lg)',
              background: 'var(--bento-card-bg)',
              border: '1px solid var(--bento-border)',
              marginBottom: '20px'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--bento-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Account Security Rating
              </div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: '4px 0 2px 0', color: 'var(--bento-text-main)' }}>
                {score >= 85 ? 'Strong Protection' : score >= 65 ? 'Moderate Risk Exposure' : 'Security Vulnerabilities Detected'}
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--bento-text-muted)' }}>
                Evaluated against 2FA configuration, phonebook sync exposure, and profile audit logs.
              </p>
            </div>

            <div style={{ textAlign: 'center', paddingLeft: '20px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: 800,
                  color: gradeColor,
                  background: 'var(--bento-card-subtle)',
                  border: `2px solid ${gradeColor}`,
                  boxShadow: 'var(--bento-shadow-sm)'
                }}
              >
                {grade}
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--bento-text-muted)', marginTop: '4px' }}>
                {score} / 100
              </div>
            </div>
          </div>

          {/* Findings List */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--bento-text-main)' }}>
              Audit Findings ({findings.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {findings.map((finding, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--bento-radius-md)',
                  background: 'var(--bento-card-bg)',
                  border: '1px solid var(--bento-border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <div style={{ marginTop: '2px', flexShrink: 0 }}>
                  {finding.type === 'good' ? (
                    <IconCheckCircle size={16} />
                  ) : finding.type === 'warning' ? (
                    <IconAlertTriangle size={16} />
                  ) : (
                    <IconInfo size={16} />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--bento-text-main)' }}>
                    {finding.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--bento-text-muted)', marginTop: '2px', lineHeight: 1.45 }}>
                    {finding.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actionable Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--bento-text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconZap size={14} />
                <span>Recommended Hardening Steps</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recommendations.map((rec, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', background: 'var(--bento-card-subtle)', borderRadius: 'var(--bento-radius-sm)', fontSize: '12px', color: 'var(--bento-text-main)', fontWeight: 500 }}>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
