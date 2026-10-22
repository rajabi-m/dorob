import course from './course-card.module.css';
import group from './course-group-card.module.css';
import styles from './card-skeleton.module.css';

function Bone({className = ''}: {className?: string}) {
  return <span className={`${styles.bone} ${className}`} />;
}

/** Decorative geometry only: the containing list announces loading once. */
export function CourseCardSkeleton() {
  return <div className={`${course.card} ${course.realCard} ${styles.card}`} aria-hidden="true">
    <div className={course.thumbnail}><Bone className={styles.cover}/></div>
    <div className={course.body}>
      <div className={course.textGroup}><div className={styles.lines}><Bone/><Bone className={styles.short}/><Bone className={styles.caption}/></div></div>
      <div className={course.info}><div className={styles.provider}><Bone className={styles.logo}/><Bone className={styles.name}/></div><Bone className={styles.duration}/></div>
      <div className={course.footer}><Bone className={styles.price}/><Bone className={styles.button}/></div>
    </div>
  </div>;
}

export function CourseGroupCardSkeleton() {
  return <div className={`${group.card} ${styles.card}`} aria-hidden="true">
    <div className={`${group.target} ${styles.target}`}>
      <div className={group.image}><Bone className={styles.cover}/></div>
      <div className={group.body}>
        <div className={group.heading}><Bone className={styles.groupTitle}/><Bone className={styles.duration}/></div>
        <p><Bone/><Bone className={styles.short}/></p>
        <div className={group.providers}>{[0,1,2].map(i=><Bone key={i} className={styles.name}/>)}</div>
      </div>
      <div className={group.footer}><Bone/><Bone className={styles.button}/></div>
    </div>
  </div>;
}

export function CardSkeletons({kind, count = 3, className}: {kind: 'course' | 'group'; count?: number; className?: string}) {
  const Card = kind === 'course' ? CourseCardSkeleton : CourseGroupCardSkeleton;
  return <div role="status" aria-label={kind === 'course' ? 'در حال دریافت دوره‌ها…' : 'در حال دریافت مجموعه‌ها…'}>
    <div className={className}>{Array.from({length: count}, (_, i)=><Card key={i}/>)}</div>
  </div>;
}

export function FeaturedCourseShelfSkeleton() {
  return <div className="hero-course-shelf hero-featured-group" aria-busy="true" role="status" aria-label="در حال دریافت مجموعه منتخب…">
    <div aria-hidden="true">
      <div className="hero-shelf-heading"><Bone className={styles.groupTitle}/><Bone className={styles.name}/></div>
      <div className="hero-shelf-courses">{[0,1,2].map(i=><div className="hero-shelf-course" key={i}>
        <span className="hero-shelf-logo"><Bone className={styles.logo}/></span>
        <span className={`hero-shelf-content ${styles.lines}`}><Bone/><Bone className={styles.short}/><Bone className={styles.price}/></span>
      </div>)}</div>
    </div>
  </div>;
}
