import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function InstrumentsData() {
  const supabase = await createClient();
  const { data: instruments, error } = await supabase
    .from("instruments")
    .select("*", { count: "exact" });

  const items = instruments ?? [];

            const imageUrl = `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/Meeting with YEW CHOON YUEN-20260411_054130-Meeting Recording.mp4`;
            const convertedUrl = encodeURI(imageUrl);

  return (

    
    <div className="space-y-4">

      <video 
      width="640" 
      height="360" 
      controls 
      preload="none" 
      aria-label="Video player"
    >
      <source src={convertedUrl} type="video/mp4" />
      Your browser does not support the video tag.
    </video>

      {error ? <p>Failed to load instruments: {error.message}</p> : null}

      {!error && items.length === 0 ? <p>No instruments found.</p> : null}

      {!error && items.length > 0 ? (
        <div className="grid gap-4 p-4">
          {items.map((item, index) => (
            <div key={index} className="rounded shadow-md p-4 hover:bg-amber-200 transition-colors">
              <h2 className="mb-2 font-semibold">Instrument {index + 1}</h2>
              <p className="text-gray-600">{item.name}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Instruments() {
  return (
    <Suspense fallback={<div>Loading instruments...</div>}>
      <InstrumentsData />
    </Suspense>
  );
}