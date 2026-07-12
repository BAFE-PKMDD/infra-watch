const fs = require('fs');
const file = 'app/(public)/projects/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('import { useQuery } from "@tanstack/react-query";', 'import { useInfiniteQuery } from "@tanstack/react-query";\nimport { useInView } from "react-intersection-observer";');

content = content.replace(/const \{ data: realProjects, isLoading \} = useQuery\(\{[\s\S]*?\}\);\s*const projectsToDisplay = realProjects \|\| \[\];/, '');

const newHook = `  const { ref, inView } = useInView();

  const { 
    data: queryData, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ["public-projects", searchQuery, activeProgram, selectedRegion, selectedProvince, selectedMunicipality, selectedBarangay, selectedStatus, selectedYear],
    queryFn: ({ pageParam = 1 }) => getAllPublicProjects({
      searchQuery,
      program: activeProgram,
      region: selectedRegion,
      province: selectedProvince,
      municipality: selectedMunicipality,
      barangay: selectedBarangay,
      status: selectedStatus,
      year: selectedYear,
      pageParam
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
  });

  const filteredProjects = queryData?.pages.flatMap((page) => page.data) || [];

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);`;

content = content.replace(/const filteredProjects = useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);/, newHook);

const observerDiv = `
          {hasNextPage && (
            <div ref={ref} className="w-full py-8 flex justify-center mt-4 col-span-full">
              {isFetchingNextPage && <Loader2 className="w-8 h-8 text-primary animate-spin" />}
            </div>
          )}`;

content = content.replace(/<\/AnimatePresence>\s*<\/motion\.div>/g, '</AnimatePresence>\n          </motion.div>' + observerDiv);

fs.writeFileSync(file, content);
