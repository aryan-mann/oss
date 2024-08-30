Packages = logseq/calendar/ logseq/tools/ logseq/todoist/

install:
	cd logseq/calendar && pnpm install
build-all:
	for item in $(Packages); do \
		cd $(CURDIR)/$$item && pnpm build && echo "Built $$item successfully!"; \
	done
clean:
	for item in $(Packages); do \
		echo rm -rf $$item/dist; \
	done