package com.healthid.dto.ai;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RecommendedArticle {

    private String title;
    private String summary;
    private String source;
}
