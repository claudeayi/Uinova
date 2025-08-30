export default function ReplayVideo({ projectId }: { projectId: string }) {
  return (
    <div className="p-4 bg-black rounded-lg">
      <video controls width="100%">
        <source src={`/api/replay/${projectId}/video`} type="video/mp4" />
        Votre navigateur ne supporte pas la vidéo.
      </video>
    </div>
  );
}
