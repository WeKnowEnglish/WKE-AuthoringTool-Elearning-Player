import Link from "next/link";

import type { PosterModuleView } from "@/lib/grammar-builder/map-poster-module";
import { grammarTeacherEditorSlugPath } from "@/lib/grammar-builder/editor/grammar-editor-paths";

import { GrammarPosterInteractiveContent } from "./GrammarPosterInteractiveContent";



type Props = {

  slug: string;

  view: PosterModuleView;

};



const showAuthorTools = process.env.NODE_ENV === "development";



export function GrammarPosterPage({ slug, view }: Props) {

  return (

    <div className="pb-2">

      <div className="mb-2">

        <Link

          href="/grammar"

          className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-2 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-transform active:scale-95"

        >

          ← Grammar

        </Link>

      </div>



      <GrammarPosterInteractiveContent view={view} interactionMode="play" />



      {showAuthorTools ? (

        <p className="mt-6 flex flex-wrap items-center justify-center gap-4 text-center">

          <Link

            href="/grammar/pilot/layouts"

            className="text-sm font-semibold text-kid-ink/40 underline-offset-2 hover:text-kid-ink/60 hover:underline"

          >

            Layout lab (authors)

          </Link>

          <Link

            href={grammarTeacherEditorSlugPath(slug)}

            className="text-sm font-semibold text-kid-ink/40 underline-offset-2 hover:text-kid-ink/60 hover:underline"

          >

            Edit poster (authors)

          </Link>

        </p>

      ) : null}

    </div>

  );

}


