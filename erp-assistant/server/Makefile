# Build Mattermost plugin server binaries
PLATFORM ?= darwin
ARCH ?= amd64
OUT_DIR := dist

.PHONY: build clean

build:
	mkdir -p $(OUT_DIR)
	GOOS=$(PLATFORM) GOARCH=$(ARCH) go build -o $(OUT_DIR)/plugin-$(PLATFORM)-$(ARCH)

clean:
	rm -rf $(OUT_DIR)
