export default function Card({ title, description, image }: { title: string, description: string, image?: string }) {
  return (
    <div className="card">
      {image && <img src={image} alt={title} className="card-img" />}
      <div className="card-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}
