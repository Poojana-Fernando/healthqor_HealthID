package com.healthid.entity;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorEducation {

    private String degree;

    private String institution;

    private Integer year;
}
