import styles from './sections.module.css';

export default function Projects({ headingId }) {
  return (
    <article className={styles.section}>
      <h2 id={headingId}>Projects</h2>
      <p className={styles.summary}>Side projects built to learn, solve real problems, and have fun.</p>

      <div className={styles.entry}>
        <div className={styles.entryHeader}>
          <h3>Smart Meeting Notes Platform</h3>
          <p className={styles.muted}>Full-stack platform for automated meeting transcription</p>
          <div className={styles.tags}>
            <span className={styles.tag}>React</span>
            <span className={styles.tag}>Express</span>
            <span className={styles.tag}>PostgreSQL</span>
            <span className={styles.tag}>Prisma</span>
            <span className={styles.tag}>Redis</span>
            <span className={styles.tag}>BullMQ</span>
          </div>
        </div>
        <ul className={styles.bullets}>
          <li>Designed and built a full-stack platform for automated meeting transcription, summarization, and action item extraction.</li>
          <li>Architected an asynchronous audio processing pipeline using Redis + BullMQ for transcription job queueing — decoupling upload latency from compute-heavy processing.</li>
          <li>Implemented JWT authentication with refresh tokens and role-based route protection across client and server, backed by a normalized PostgreSQL schema covering users, meetings, transcripts, and action items.</li>
        </ul>
      </div>

      <div className={styles.entry}>
        <div className={styles.entryHeader}>
          <h3>StreetGuard — Urban Infrastructure Reporting</h3>
          <p className={styles.muted}>Citizen reporting system for urban issues</p>
          <div className={styles.tags}>
            <span className={styles.tag}>MERN</span>
            <span className={styles.tag}>Mapbox</span>
            <span className={styles.tag}>Cloudinary</span>
          </div>
        </div>
        <ul className={styles.bullets}>
          <li>Built a full-stack MERN web application enabling citizens to report urban infrastructure issues (potholes, damaged roads, flooding) with image uploads, geotagged locations, and urgency ratings.</li>
          <li>Integrated Mapbox API for geospatial visualization of reported issues on a responsive map, and Cloudinary for image storage and CDN delivery.</li>
          <li>Implemented an issue lifecycle tracking system (reported → verified → in-progress → resolved) with transparent status updates and admin validation tools.</li>
        </ul>
      </div>

      <div className={styles.entry}>
        <div className={styles.entryHeader}>
          <h3>The Ride of Aravind — This Portfolio</h3>
          <p className={styles.muted}>Interactive canvas-based portfolio</p>
          <div className={styles.tags}>
            <span className={styles.tag}>React</span>
            <span className={styles.tag}>Vite</span>
            <span className={styles.tag}>HTML5 Canvas</span>
          </div>
        </div>
        <ul className={styles.bullets}>
          <li>Designed and built a canvas-based interactive portfolio featuring a looping animated world with 4 distinct visual themes (Lo-fi, Pixel Art, Storybook, Blueprint).</li>
          <li>Built from scratch — procedurally animated cyclist with IK rig, dynamic weather system, day/night cycle, and seamless world looping — to showcase raw JavaScript, animation, and rendering fundamentals.</li>
        </ul>
      </div>
    </article>
  );
}
