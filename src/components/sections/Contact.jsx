import styles from './sections.module.css';

export default function Contact({ headingId }) {
  return (
    <article className={styles.section}>
      <h2 id={headingId}>Contact</h2>
      <p className={styles.summary}>Let's connect — I'm always happy to chat about code, projects, or opportunities.</p>

      <div className={styles.contactGrid}>
        <div className={styles.contactRow}>
          <span className={styles.contactLabel}>Email</span>
          <a className={styles.link} href="mailto:aravindreddy.beeravelli123@gmail.com">aravindreddy.beeravelli123@gmail.com</a>
        </div>

        <div className={styles.contactRow}>
          <span className={styles.contactLabel}>Phone</span>
          <span className={styles.contactValue}>+91 9381373847</span>
        </div>

        <div className={styles.contactRow}>
          <span className={styles.contactLabel}>Location</span>
          <span className={styles.contactValue}>Hyderabad, Telangana, India</span>
        </div>

        <div className={styles.contactRow}>
          <span className={styles.contactLabel}>LinkedIn</span>
          <a className={styles.link} href="https://www.linkedin.com/in/aravind-reddy-0b8b26268" target="_blank" rel="noopener noreferrer">linkedin.com/in/aravind-reddy-0b8b26268</a>
        </div>

        <div className={styles.contactRow}>
          <span className={styles.contactLabel}>GitHub</span>
          <a className={styles.link} href="https://github.com/Aravind-Reddy12" target="_blank" rel="noopener noreferrer">github.com/Aravind-Reddy12</a>
        </div>
      </div>
    </article>
  );
}
