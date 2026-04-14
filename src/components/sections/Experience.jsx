import styles from './sections.module.css';

export default function Experience({ headingId }) {
  return (
    <article className={styles.section}>
      <h2 id={headingId}>Experience</h2>
      <p className={styles.summary}>~2 years building production-grade frontend interfaces for enterprise data engineering platforms.</p>

      <div className={styles.entry}>
        <div className={styles.entryHeader}>
          <h3>Modak Analytics LLP</h3>
          <p className={styles.muted}>Hyderabad, India</p>
          <p className={styles.muted}>Software Development Engineer · Oct 2024 – Present</p>
          <p className={styles.muted}>Software Intern · Jun 2024 – Oct 2024</p>
        </div>

        <div className={styles.subEntry}>
          <h4 className={styles.subEntryTitle}>ForgeAI</h4>
          <p className={styles.subEntrySubtitle}>AI-first data engineering platform</p>
          <div className={styles.tags}>
            <span className={styles.tag}>Vue 3</span>
            <span className={styles.tag}>Composition API</span>
            <span className={styles.tag}>Tailwind CSS</span>
            <span className={styles.tag}>TypeScript</span>
            <span className={styles.tag}>REST APIs</span>
          </div>
          <ul className={styles.bullets}>
            <li>Built a core user-facing module handling data source onboarding, configuration, filtering, and profiling workflows across 6+ enterprise integrations — the primary interface for users to connect and manage their data.</li>
            <li>Optimized an infinite-scroll data loader, reducing DOM nodes by ~50% on large views and delivering smooth scroll on lists with thousands of items.</li>
            <li>Shipped a reusable multi-filter configuration UI with chip-based display, overflow handling, and full create/edit/duplicate lifecycle — adopted across multiple connector types.</li>
            <li>Delivered targeted fixes across 5+ cross-cutting components including auth-aware form validation, debounced search, and overlay z-index conflicts.</li>
            <li>Collaborated with backend engineers and UI/UX designers, participating in code reviews to maintain frontend code quality.</li>
          </ul>
        </div>

        <div className={styles.subEntry}>
          <h4 className={styles.subEntryTitle}>Modak Nabu</h4>
          <p className={styles.subEntrySubtitle}>Data engineering and pipeline orchestration platform</p>
          <div className={styles.tags}>
            <span className={styles.tag}>Vue 2/3</span>
            <span className={styles.tag}>Vuex</span>
            <span className={styles.tag}>View Design</span>
            <span className={styles.tag}>Tailwind CSS</span>
            <span className={styles.tag}>Go.js</span>
          </div>
          <ul className={styles.bullets}>
            <li>Developed 20+ configurable pipeline node types (sources, destinations, executors, REST API nodes) integrating with S3, JDBC, Hive, Salesforce, and 15+ enterprise systems — driving backend Spark jobs through a visual configuration layer.</li>
            <li>Built an interactive drag-and-drop graph interface powered by Go.js, enabling users to visually construct data pipelines through node placement and live connection rendering.</li>
            <li>Developed monitoring dashboards surfacing real-time execution status, data transfer volumes, and historical job runs across hundreds of concurrent pipelines.</li>
            <li>Created reusable form components to reduce dependency on external libraries, improving design consistency and cutting development time.</li>
            <li>Implemented Tailwind CSS with best-practice config, resulting in a 30% reduction in CSS bundle size and faster page loads.</li>
          </ul>
        </div>
      </div>
    </article>
  );
}
