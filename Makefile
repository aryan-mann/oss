Packages = logseq/calendar/ logseq/tools/ logseq/todoist/

install:
	cd logseq/calendar && pnpm install
build-all:
	for item in $(Packages); do \
		echo $$item; \
	done
clear-dist:
	for item in $(Packages); do \
		echo rm -rf $$item/dist; \
	done