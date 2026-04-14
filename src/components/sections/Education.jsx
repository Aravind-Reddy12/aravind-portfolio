import styles from './sections.module.css';

export default function Education({ headingId }) {
  return (
    <article className={styles.section}>
      <h2 id={headingId}>Education</h2>
      <p className={styles.summary}>Where the journey began — building foundations in computer science and falling in love with software.</p>

      <div className={styles.entry}>
        <div className={styles.entryHeader}>
          <h3>B.Tech, Computer Science Engineering</h3>
          <p className={styles.muted}>Mahatma Gandhi Institute of Technology, Hyderabad · 2020 – 2024</p>
          <p className={styles.muted}>CGPA: 8.3</p>
        </div>
      </div>

      <div className={styles.entry}>
        <div className={styles.entryHeader}>
          <h3>Certifications</h3>
        </div>
        <ul className={styles.bullets}>
          <li>Full Stack Web Developer Bootcamp</li>
          <li>Database Programming with SQL — Oracle</li>
        </ul>
      </div>
    </article>
  );
}
