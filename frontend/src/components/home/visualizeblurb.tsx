import Image from "next/image";

export default function VisualizeBlurb() {
  return (
    <hgroup className="relative w-fit bg-off-white p-6 shadow-lg/50 hidden lg:block">
      
      <h2 className="self-end text-right leading-tight text-3xl">
        <Image
            src="/interface/magnifying-glass.png"
            alt=""
            width={304}
            height={185}
            className="absolute -left-34 -top-0.5 -rotate-240"
          />
          Visualize your research, <br/> your way.
      </h2>
      <p className="mt-8 self-end text-right leading-snug">
        Research analysis tools tailored <br/> to your level of understanding.
      </p>
    </hgroup>
  );
}
